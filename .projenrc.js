const { JsiiProject, Semver } = require('projen');

const project = new JsiiProject({
  name: 'cdk8s-debore',
  jsiiVersion: Semver.caret('1.5.0'),
  description: 'Run your apps on Kubernetes cluster without bored YAMLing',
  repository: 'https://github.com/toricls/cdk8s-debore.git',
  authorName: 'Tori',
  authorEmail: 'yshr@amazon.com',
  stability: 'experimental',
  peerDependencies: {
    cdk8s: Semver.caret('0.20.0'),
    constructs: Semver.caret('2.0.1'),
  },
  python: {
    distName: 'cdk8s-debore',
    module: 'cdk8s_debore'
  }
});

project.synth();
