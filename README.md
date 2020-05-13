# cdk8s-debore

Run your apps on Kubernetes cluster without bored YAMLing, powered by the [cdk8s project](https://cdk8s.io) 🚀

## Overview

**cdk8s-debore** is a [cdk8s](https://cdk8s.io) library which allows you to define your Kubernetes app with just few lines of code.

```typescript
new DeboredApp(this, 'webapp', {
  image: 'your-image:latest',
  autoScale: true,
  ingress: IngressType.NGINX_INGRESS
});
```

Then the Kubernetes manifests created by `cdk8s synth` command will have Kubernetes resources such as `Deployment`, `Service`, `HorizontalPodAutoscaler`, `Ingress`, as follows.

<details>
<summary>manifest.k8s.yaml</summary>

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app-webapp-deployment-deployment-d67b425c
  namespace: default
spec:
  selector:
    matchLabels:
      app: myappwebapp4BD95A2A
  template:
    metadata:
      labels:
        app: myappwebapp4BD95A2A
    spec:
      containers:
        - image: your-image:latest
          imagePullPolicy: Always
          name: app
          ports:
            - containerPort: 8080
          resources:
            limits:
              cpu: 400m
              memory: 512Mi
            requests:
              cpu: 200m
              memory: 256Mi
---
apiVersion: autoscaling/v2beta2
kind: HorizontalPodAutoscaler
metadata:
  name: my-app-webapp-deployment-hpa-bd8107fd
  namespace: default
spec:
  maxReplicas: 10
  metrics:
    - resource:
        name: cpu
        target:
          averageUtilization: 85
          type: Utilization
      type: Resource
    - resource:
        name: memory
        target:
          averageUtilization: 75
          type: Utilization
      type: Resource
  minReplicas: 1
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: my-app-webapp-deployment-deployment-d67b425c
---
apiVersion: v1
kind: Service
metadata:
  name: my-app-webapp-exposable-service-d6a35671
  namespace: default
spec:
  ports:
    - port: 8080
      targetPort: 80
  selector:
    app: myappwebapp4BD95A2A
  type: ClusterIP
---
apiVersion: networking.k8s.io/v1beta1
kind: Ingress
metadata:
  annotations:
    kubernetes.io/ingress.class: nginx
    nginx.ingress.kubernetes.io/rewrite-target: /
  name: my-app-webapp-exposable-ingress-c350957f
  namespace: default
spec:
  rules:
    - http:
        paths:
          - backend:
              serviceName: my-app-webapp-exposable-service-d6a35671
              servicePort: 80
            path: /my-app-webapp-deployment-deployment-d67b425c
```

</details>

## Installation

[cdk8s](https://cdk8s.io) supports TypeScript and Python at this point, so as cdk8s-debore.

We'd recommend to walk through the [cdk8s Getting Started guide](https://cdk8s.io/getting-started/) before using this library, if you're very new to cdk8s world.

### TypeScript

Use `npm` or `yarn` to install.

```shell
$ npm install -s cdk8s-debore
```

or

```shell
$ yarn add cdk8s-debore
```

### Python

```shell
$ pip install cdk8s-debore
```

## Contribution

1. Fork ([https://github.com/toricls/cdk8s-debore/fork](https://github.com/toricls/cdk8s-debore/fork))
2. Bootstrap the repo:
  
    ```bash
    npx projen   # generates package.json and friends
    yarn install # installs dependencies
    ```
3. Development scripts:
   |Command|Description
   |-|-
   |`yarn compile`|Compiles typescript => javascript
   |`yarn watch`|Watch & compile
   |`yarn test`|Run unit test & linter through jest
   |`yarn test -u`|Update jest snapshots
   |`yarn run package`|Creates a `dist` with packages for all languages.
   |`yarn build`|Compile + test + package
   |`yarn bump`|Bump version (with changelog) based on [conventional commits]
   |`yarn release`|Bump + push to `master`
4. Create a feature branch
5. Commit your changes
6. Rebase your local changes against the master branch
7. Create a new Pull Request (use [conventional commits] for the title please)

[conventional commits]: https://www.conventionalcommits.org/en/v1.0.0/

## Licence

[Apache License, Version 2.0](./LICENSE)

## Author

[Tori](https://github.com/toricls)
