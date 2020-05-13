import { Construct, Node } from 'constructs';
import * as k8s from '../imports/k8s';

export interface DeboredOptions {
  /**
   * The Kubernetes namespace where this app to be deployed.
   * @default 'default'
   */
  readonly namespace?: string;
  
  /**
   * The Docker image to use for this app.
   */
  readonly image: string;

  /**
   * Number of replicas.
   *
   * If `autoScale` is enabled, this will be used for `minReplicas` (while
   * `maxReplicas` is x10). Otherwise, this value will be used to specify the
   * exact number of replicas in the deployment.
   *
   * @default 1
   */
  readonly defaultReplicas?: number;
  
  /**
   * External port.
   * @default 80
   */
  readonly port?: number;

  /**
   * Internal port.
   * @default 8080
   */
  readonly containerPort?: number;

  /**
   * Whether use HPA or not.
   * @default false
   */
  readonly autoScale?: boolean;

  /**
   * The type of ingress.
   * @default IngressType.SERVICE_LOADBALANCER
   */
  readonly ingress?: IngressType;

  /**
   * Resources requests for the web app.
   * @default - Requests = { CPU = 200m, Mem = 256Mi }, Limits = { CPU = 400m, Mem = 512Mi }
   */
  readonly resources?: ResourceRequirements;
}

export enum IngressType {
  SERVICE_LOADBALANCER,
  CLUSTER_IP,
  NGINX_INGRESS
}

function serviceTypeFromIngressType(ingressType: IngressType): string {
  switch (ingressType) {
    case IngressType.SERVICE_LOADBALANCER: return 'LoadBalancer';
    case IngressType.CLUSTER_IP: return 'ClusterIP';
    case IngressType.NGINX_INGRESS: return 'ClusterIP';
    default: throw new Error('unsupported ingress type');
  }
}

export interface ResourceRequirements {
  /**
   * Maximum resources for the web app.
   * @default - CPU = 400m, Mem = 512Mi
   */
  readonly limits?: ResourceQuantity;

  /**
   * Required resources for the web app.
   * @default - CPU = 200m, Mem = 256Mi
   */
  readonly requests?: ResourceQuantity;
}

export interface ResourceQuantity {
  /**
   * @default - no limit
   */
  readonly cpu?: string;

  /**
   * @default - no limit
   */
  readonly memory?: string;
}

/**
 * DeboredApp class.
 */
export class DeboredApp extends Construct {
  constructor(scope: Construct, name: string, opts: DeboredOptions) {
    super(scope, name);

    const selector = { app: Node.of(this).uniqueId };
    const deployment = new DeboredDeployment(this, 'deployment', selector, opts);
    
    new Exposable(this, 'exposable', {
      deployment: deployment,
      port: opts.port ?? 80,
      selector: selector,
      ingressType: opts.ingress ?? IngressType.SERVICE_LOADBALANCER,
    });
  }
}

class DeboredDeployment extends Construct {
  public readonly name: string;
  public readonly namespace: string;
  public readonly containerPort: number;

  constructor(scope: Construct, name: string, selector: { [key: string]: string }, opts: DeboredOptions) {
    super(scope, name);

    const scalable = opts.autoScale ?? false;
    const defaultReplicas = opts.defaultReplicas ?? 1;
    const replicas = scalable ? undefined : defaultReplicas;
    const imageName = opts.image;
    const containerPort = opts.containerPort ?? 8080;
    this.containerPort = containerPort;
    const namespace = opts.namespace ?? 'default';
    this.namespace = namespace;
    const resources = {
      limits: convertQuantity(opts.resources?.limits, { cpu: '400m', memory: '512Mi' }),
      requests: convertQuantity(opts.resources?.requests, { cpu: '200m', memory: '256Mi' }),
    };

    const deploymentOpts: k8s.DeploymentOptions = {
      metadata: {
        namespace: namespace,
      },
      spec: {
        replicas: replicas,
        selector: { matchLabels: selector },
        template: {
          metadata: { labels: selector },
          spec: {
            containers: [{
              name: 'app',
              image: imageName,
              imagePullPolicy: 'Always',
              ports: [ { containerPort } ],
              resources: resources,
            }],
          },
        },
      },
    };
    
    const deployment = new k8s.Deployment(this, 'deployment', deploymentOpts);
    this.name = deployment.name;
    
    if (scalable) { 
      new k8s.HorizontalPodAutoscaler(this, 'hpa', {
        metadata: {
          namespace: namespace,
        },
        spec: {
          scaleTargetRef: {
            apiVersion: deployment.apiVersion,
            kind: deployment.kind,
            name: deployment.name,
          },
          minReplicas: defaultReplicas,
          maxReplicas: defaultReplicas * 10,
          metrics: [
            { 
              type: 'Resource',
              resource: {
                name: 'cpu',
                target: {
                  type: 'Utilization',
                  averageUtilization: 85,
                },
              },
            },
            {
              type: 'Resource',
              resource: {
                name: 'memory',
                target: {
                  type: 'Utilization',
                  averageUtilization: 75,
                },
              },
            },
          ],
        },
      })
    }
  }
}

interface ExposableOptions {
  readonly deployment: DeboredDeployment,
  readonly port: number,
  readonly selector: { [key: string]: string }
  readonly ingressType: IngressType
}

class Exposable extends Construct {
  constructor(scope: Construct, name: string, opts: ExposableOptions) {
    super(scope, name);

    const svc = new k8s.Service(this, 'service', {
      metadata: {
        namespace: opts.deployment.namespace,
      },
      spec: {
        type: serviceTypeFromIngressType(opts.ingressType),
        ports: [ { port: opts.port, targetPort: k8s.IntOrString.fromNumber(opts.deployment.containerPort) } ],
        selector: opts.selector,
      },
    });
    // Add a Kubernetes Ingress resource if it's needed
    if (opts.ingressType == IngressType.NGINX_INGRESS) {
      new k8s.Ingress(this, 'ingress', {
        metadata: {
          namespace: opts.deployment.namespace,
          annotations: {
            'kubernetes.io/ingress.class': 'nginx',
            'nginx.ingress.kubernetes.io/rewrite-target': '/',
          },
        },
        spec: {
          rules: [{
            http: {
              paths: [{
                backend: {
                  serviceName: svc.name,
                  servicePort: opts.port,
                },
                path: '/' + opts.deployment.name,
              }],
            },
          }],
        },
      });
    }
  }
}

/**
 * Converts a `ResourceQuantity` type to a k8s.Quantity map.
 *
 * If `user` is defined, the values provided there (or lack thereof) will be
 * passed on. This means that if the user, for example, did not specify a value
 * for `cpu`, this value will be omitted from the resource requirements. This is
 * intentional, in case the user intentionally wants to omit a constraint.
 * 
 * If `user` is not defined, `defaults` are used.
 */
function convertQuantity(user: ResourceQuantity | undefined, defaults: { cpu: string, memory: string }): { [key: string]: k8s.Quantity } {

  // defaults
  if (!user) {
    return {
      cpu: k8s.Quantity.fromString(defaults.cpu),
      memory: k8s.Quantity.fromString(defaults.memory),
    }
  }

  const result: { [key: string]: k8s.Quantity } = { };
  
  if (user.cpu) {
    result.cpu = k8s.Quantity.fromString(user.cpu);
  }

  if (user.memory) {
    result.memory = k8s.Quantity.fromString(user.memory);
  }

  return result;
};
