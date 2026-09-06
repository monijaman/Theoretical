
function withMilk(WrappedComponent) {
  const ComponentWithMilk = (props) => {
    const newDescription = (props.description ?? '') + ' + Milk';
    return <WrappedComponent {...props} description={newDescription} />;
  };

  ComponentWithMilk.displayName = `withMilk(${WrappedComponent.displayName || WrappedComponent.name || 'Component'})`;

  return ComponentWithMilk;
}

export default withMilk;
