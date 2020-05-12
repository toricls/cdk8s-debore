import { Construct, Node } from 'constructs';
import * as k8s from '../imports/k8s';

export interface WebAppOptions {
  /**
   * The Kubernetes namespace where this web app deployed.
   * @default 'default'
   */
  readonly namespace?: string;
  
  /**
   * The Docker image to use for this web app.
   * @default 'busybox'
   */
  readonly image?: string;

  /**
   * Number of replicas.
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
   */
  readonly autoScale?: boolean;

  /**
   * Whether use Nginx ingress or not.
   */
  readonly ingress?: boolean;

  /**
   * Resources requests for the web app.
   * @default Requests = { CPU = 200, Mem = 256Mi }, Limits = { CPU = 400, Mem = 512Mi }
   */
  readonly resources?: ResourceRequirements;
}

export interface ResourceRequirements {
  /**
   * Maximum resources for the web app.
   * @default CPU = 400, Mem = 512Mi
   */
  readonly limits: ResourceQuantity;

  /**
   * Required resources for the web app.
   * @default CPU = 200, Mem = 256Mi
   */
  readonly requests: ResourceQuantity;
}

export interface ResourceQuantity {
  readonly cpu: k8s.Quantity;
  readonly memory: k8s.Quantity;
}

/**
 * WebApp class.
 */
export class WebApp extends Construct {
  constructor(scope: Construct, name: string, opts: WebAppOptions) {
    super(scope, name);

    const selector = { app: Node.of(this).uniqueId };
    const deployment = new WebAppDeployment(this, 'deployment', selector, opts);
    new Exposable(this, {
      deployment: deployment,
      port: opts.port || 80,
      selector: selector,
      useIngress: opts.ingress || false
    })
  }
}

class WebAppDeployment extends Construct {
  private name: string;
  private namespace: string;
  private containerPort: number;

  constructor(scope: Construct, name: string, selector: { [key: string]: string }, opts: WebAppOptions) {
    super(scope, name);

    const scalable = opts.autoScale || false;
    const defaultReplicas = opts.defaultReplicas || 1;
    const replicas = scalable ? undefined : defaultReplicas;
    const imageName = opts.image || 'busybox';
    const containerPort = opts.containerPort || 8080;
    this.containerPort = containerPort;
    const namespace = opts.namespace || 'default';
    this.namespace = namespace;
    const resources = opts.resources || { limits: { cpu: '400m', memory: '512Mi' }, requests: { cpu: '200m', memory: '256Mi' }}

    const deploymentOpts = {
      metadata: {
        namespace: namespace
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
              resources: {
                limits: { cpu: resources.limits.cpu, memory: resources.limits.memory },
                requests: { cpu: resources.requests.cpu, memory: resources.requests.memory }
              }
            }]
          }
        }
      }
    };
    
    const deployment = new k8s.Deployment(this, 'deployment', deploymentOpts);
    this.name = deployment.name;
    
    if (scalable) { 
      new k8s.HorizontalPodAutoscaler(this, 'hpa', {
        metadata: {
          namespace: namespace
        },
        spec: {
          scaleTargetRef: {
            apiVersion: deployment.apiVersion,
            kind: deployment.kind,
            name: deployment.name
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
                  averageUtilization: 85
                }
              }
            },
            {
              type: 'Resource',
              resource: {
                name: 'memory',
                target: {
                  type: 'Utilization',
                  averageUtilization: 75
                }
              }
            }
          ]
        }
      })
    }
  }

  public getName(): string {
    return this.name;
  }

  public getNamespace(): string {
    return this.namespace;
  }

  public getContainerPort(): number {
    return this.containerPort;
  }
}

interface ExposableOptions {
  readonly deployment: WebAppDeployment,
  readonly port: number,
  readonly selector: { [key: string]: string }
  readonly useIngress: boolean
}

class Exposable extends Construct {
  constructor(scope: Construct, opts: ExposableOptions) {
    super(scope, 'exposable');

    const svc = new k8s.Service(this, 'service', {
      metadata: {
        namespace: opts.deployment.getNamespace()
      },
      spec: {
        type: opts.useIngress ? 'ClusterIP' : 'LoadBalancer',
        ports: [ { port: opts.port, targetPort: k8s.IntOrString.fromNumber(opts.deployment.getContainerPort()) } ],
        selector: opts.selector
      }
    });
    if (opts.useIngress) {
      new k8s.Ingress(this, 'ingress', {
        metadata: {
          namespace: opts.deployment.getNamespace(),
          annotations: {
            'kubernetes.io/ingress.class': 'nginx',
            'nginx.ingress.kubernetes.io/rewrite-target': '/'
          }
        },
        spec: {
          rules: [{
            http: {
              paths: [{
                backend: {
                  serviceName: svc.name,
                  servicePort: opts.port
                },
                path: '/' + opts.deployment.getName()
              }]
            }
          }]
        }
      });
    }
  }
}
