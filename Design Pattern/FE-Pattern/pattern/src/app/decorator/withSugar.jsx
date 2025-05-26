 

function withSugar(WrappedComponent) {
  const ComponentWithSugar = (props) => {
    const newDescription = (props.description ?? '') + ' + Sugar';
    return <WrappedComponent {...props} description={newDescription} />;
  };

  ComponentWithSugar.displayName = `withSugar(${WrappedComponent.displayName || WrappedComponent.name || 'Component'})`;

  return ComponentWithSugar;
}

export default withSugar;


// The displayName property is a built-in React convention (not something you define) used purely for debugging purposes — for example, in React DevTools or error stack traces.



