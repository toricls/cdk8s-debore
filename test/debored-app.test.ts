import { Testing, Chart } from 'cdk8s';
import { DeboredApp } from '../lib';

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

test('"replicas" can be used to control the number of replicas', () => {
  // GIVEN
  const app = Testing.app();
  const chart = new Chart(app, 'test');
  
  // WHEN
  new DeboredApp(chart, 'myapp', {
    image: 'myimage',
    replicas: 10,
  });

  // THEN
  expect(Testing.synth(chart)).toMatchSnapshot();
});

test('"ingress" installs an nginx-based ingress controller', () => {
  // GIVEN
  const app = Testing.app();
  const chart = new Chart(app, 'test');
  
  // WHEN
  new DeboredApp(chart, 'myapp', {
    image: 'myimage',
    ingress: true,
  });

  // THEN
  expect(Testing.synth(chart)).toMatchSnapshot();
});