import { Construct } from 'constructs';
import { App, Chart } from 'cdk8s';
import { WebApp } from '../lib/index';

class MyWebApp extends Chart {
    constructor(scope: Construct, name: string) {
        super(scope, name);

        const opts = {
            namespace: 'default',
            image: 'nginx',
            defaultReplicas: 2,
            port: 80,
            containerPort: 80,
            autoScale: true,
            ingress: true,
            resources: {
                limits: { cpu: '400m', memory: '512Mi' },
                requests: { cpu: '200m', memory: '256Mi' }
            }
        };

        new WebApp(this, 'webapp', opts);
    }
}

const app = new App();
new MyWebApp(
    app,
    'my-app'
);
app.synth();
