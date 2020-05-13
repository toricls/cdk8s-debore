import { Construct } from 'constructs';
import { App, Chart } from 'cdk8s';
import { DeboredApp, IngressType } from '../lib/index';

class MyChart extends Chart {
  constructor(scope: Construct, name: string) {
    super(scope, name);

    new DeboredApp(this, 'minimal', {
      image: 'nginx',
    });
  
    new DeboredApp(this, 'with-full-options', {
      namespace: 'default',
      image: 'nginx',
      defaultReplicas: 2,
      port: 80,
      containerPort: 80,
      autoScale: true,
      ingress: IngressType.NGINX_INGRESS,
      resources: {
        limits: { cpu: '400m', memory: '512Mi' },
        requests: { cpu: '200m', memory: '256Mi' },
      },
    });
  }
}

const app = new App();
new MyChart(app, 'my-chart');
app.synth();
