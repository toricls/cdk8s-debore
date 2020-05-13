import { Testing, Chart } from 'cdk8s';
import { DeboredApp, IngressType } from '../lib';

test('minimal configuration', () => {
  // GIVEN
  const app = Testing.app();
  const chart = new Chart(app, 'test');
  
  // WHEN
  new DeboredApp(chart, 'myapp', {
    image: 'myimage',
  });

  // THEN
  expect(Testing.synth(chart)).toMatchSnapshot();
});

test('"namespace" controls the k8s namespace to use"', () => {
  // GIVEN
  const app = Testing.app();
  const chart = new Chart(app, 'test');
  
  // WHEN
  new DeboredApp(chart, 'myapp', {
    image: 'myimage',
    namespace: 'hello.namespace',
  });

  // THEN
  expect(Testing.synth(chart)).toMatchSnapshot();
});

test('"autoScale" will define pod autoscaling with sensible configuration', () => {
  // GIVEN
  const app = Testing.app();
  const chart = new Chart(app, 'test');
  
  // WHEN
  new DeboredApp(chart, 'myapp', {
    image: 'myimage',
    autoScale: true,
  });

  // THEN
  expect(Testing.synth(chart)).toMatchSnapshot();
});

test('"defaultReplicas" can be used to control the number of replicas', () => {
  // GIVEN
  const app = Testing.app();
  const chart = new Chart(app, 'test');
  
  // WHEN
  new DeboredApp(chart, 'myapp', {
    image: 'myimage',
    defaultReplicas: 10,
  });

  // THEN
  expect(Testing.synth(chart)).toMatchSnapshot();
});

test('"ingress == CLUSTER_IP" uses a ClusterIP service', () => {
  // GIVEN
  const app = Testing.app();
  const chart = new Chart(app, 'test');
  
  // WHEN
  new DeboredApp(chart, 'myapp', {
    image: 'myimage',
    ingress: IngressType.CLUSTER_IP,
  });

  // THEN
  expect(Testing.synth(chart)).toMatchSnapshot();
});

test('"ingress == NGINX_INGRESS" uses an nginx ingress', () => {
  // GIVEN
  const app = Testing.app();
  const chart = new Chart(app, 'test');
  
  // WHEN
  new DeboredApp(chart, 'myapp', {
    image: 'myimage',
    ingress: IngressType.NGINX_INGRESS,
  });

  // THEN
  expect(Testing.synth(chart)).toMatchSnapshot();
});
