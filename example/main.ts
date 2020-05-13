import { Construct } from 'constructs';
import { App, Chart } from 'cdk8s';
import { DeboredApp } from '../lib/index';

class MyWebApp extends Chart {
    constructor(scope: Construct, name: string) {
        super(scope, name);

        const opts = {
            namespace: 'default',
            image: 'nginx',
            defaultReplicas: 2,
            port: 80,
            containerPort: 80,
            autoScale: true
        };

        new DeboredApp(this, 'webapp', opts);

        /* 
        // The `opts` above is using full option and a minimal option could be something like this :)
        const minimalOpts = {
            image: 'nginx'
        }
        */
    }
}

const app = new App();
new MyWebApp(
    app,
    'my-app'
);
app.synth();
