import { Construct } from 'constructs';
import { App, Chart } from 'cdk8s';
import { DeboredApp } from '../lib/index';

class MyChart extends Chart {
  constructor(scope: Construct, name: string) {
    super(scope, name);

    new DeboredApp(this, 'minimal', {
      image: 'nginx',
    });
  
    new DeboredApp(this, 'with-options', {
      namespace: 'default',
      image: 'nginx',
      replicas: 2,
      port: 80,
      containerPort: 80,
      autoScale: true,
    });
  }
}

const app = new App();
new MyChart(app, 'my-chart');
app.synth();
