import { Component, ReactNode } from 'react';

class Leaf extends Component<{ children?: ReactNode }> {
  static displayName = 'Leaf';

  static componentMetadata = {
    componentName: 'Leaf',
    configure: {
      props: [{
        name: 'children',
        setter: 'StringSetter',
      }],
      // events/className/style/general/directives
      supports: false,
    },
  };

  render() {
    const { children } = this.props;
    return children;
  }
}

export default Leaf;
