/** @jsx Didact.createElement */
const Didact = importFromBelow();

// Stories data
const stories = [
    { name: "Didact introduction", url: "#" },
    { name: "Rendering DOM elements ", url: "#" },
    { name: "Element creation and JSX", url: "#" },
    { name: "Instances and reconciliation", url: "#" },
    { name: "Components and state", url: "#" },
    { name: "Fiber: Incremental reconciliation", url: "#" }
];

//#region Composite Pattern
class App extends Didact.Component {
    render() {
        // Renders the main application UI with a list of stories.
        return (
            <div>
                <h1>Didact Stories</h1>
                <ul>
                    {this.props.stories.map(story => {
                        return <Story name={story.name} url={story.url} />;
                    })}
                </ul>
            </div>
        );
    }
}

class Story extends Didact.Component {
    constructor(props) {
        super(props);
        this.state = { likes: Math.ceil(Math.random() * 100) };
    }
    like() {
        // Increments the like count for a story.
        this.setState({
            likes: this.state.likes + 1
        });
    }
    render() {
        // Renders a single story with a like button and a link.
        const { name, url } = this.props;
        const { likes } = this.state;
        return (
            <li>
                <button onClick={e => this.like()}>
                    {likes}
                    <b>❤️</b>
                </button>
                <a href={url}>{name}</a>
            </li>
        );
    }
}
//#endregion Composite Pattern

//#region Composite Pattern usage
// Composite Pattern: Used to compose the UI tree with components like App and Story.
Didact.render(<App stories={stories} />, document.getElementById("root"));
//#endregion Composite Pattern usage

//#region Factory Pattern
function importFromBelow() {
    //#region Factory Pattern - element.js
    const TEXT_ELEMENT = "TEXT ELEMENT";

    function createElement(type, config, ...args) {
        // Creates a virtual DOM element with the specified type and properties.
        const props = Object.assign({}, config);
        const hasChildren = args.length > 0;
        const rawChildren = hasChildren ? [].concat(...args) : [];
        props.children = rawChildren
            .filter(c => c != null && c !== false)
            .map(c => (c instanceof Object ? c : createTextElement(c)));
        return { type, props };
    }

    function createTextElement(value) {
        // Creates a virtual DOM element for text nodes.
        return createElement(TEXT_ELEMENT, { nodeValue: value });
    }
    //#endregion Factory Pattern - element.js

    //#region dom-utils.js
    const isEvent = name => name.startsWith("on");
    const isAttribute = name =>
        !isEvent(name) && name != "children" && name != "style";
    const isNew = (prev, next) => key => prev[key] !== next[key];
    const isGone = (prev, next) => key => !(key in next);

    function updateDomProperties(dom, prevProps, nextProps) {
        // Updates the DOM properties (attributes, styles, and event listeners) of a DOM element.
        // Remove event listeners
        Object.keys(prevProps)
            .filter(isEvent)
            .filter(key => !(key in nextProps) || isNew(prevProps, nextProps)(key))
            .forEach(name => {
                const eventType = name.toLowerCase().substring(2);
                dom.removeEventListener(eventType, prevProps[name]);
            });

        // Remove attributes
        Object.keys(prevProps)
            .filter(isAttribute)
            .filter(isGone(prevProps, nextProps))
            .forEach(name => {
                dom[name] = null;
            });

        // Set attributes
        Object.keys(nextProps)
            .filter(isAttribute)
            .filter(isNew(prevProps, nextProps))
            .forEach(name => {
                dom[name] = nextProps[name];
            });

        // Set style
        prevProps.style = prevProps.style || {};
        nextProps.style = nextProps.style || {};
        Object.keys(nextProps.style)
            .filter(isNew(prevProps.style, nextProps.style))
            .forEach(key => {
                dom.style[key] = nextProps.style[key];
            });
        Object.keys(prevProps.style)
            .filter(isGone(prevProps.style, nextProps.style))
            .forEach(key => {
                dom.style[key] = "";
            });

        // Add event listeners
        Object.keys(nextProps)
            .filter(isEvent)
            .filter(isNew(prevProps, nextProps))
            .forEach(name => {
                const eventType = name.toLowerCase().substring(2);
                dom.addEventListener(eventType, nextProps[name]);
            });
    }

    function createDomElement(fiber) {
        // Creates a DOM element based on the fiber type and updates its properties.
        const isTextElement = fiber.type === TEXT_ELEMENT;
        const dom = isTextElement
            ? document.createTextNode("")
            : document.createElement(fiber.type);
        updateDomProperties(dom, [], fiber.props);
        return dom;
    }
    //#endregion dom-utils.js

    //#region Factory Pattern - component.js
    class Component {
        constructor(props) {
            this.props = props || {};
            this.state = this.state || {};
        }

        setState(partialState) {
            // Schedules a state update for the component.
            //#region Command Pattern
            scheduleUpdate(this, partialState);
            //#endregion
        }
    }

    function createInstance(fiber) {
        // Factory Pattern: Creates an instance of a class component.
        const instance = new fiber.type(fiber.props);
        instance.__fiber = fiber;
        return instance;
    }
    //#endregion Factory Pattern - component.js

    //#region Command Pattern - reconciler.js
    // Fiber tags
    const HOST_COMPONENT = "host";
    const CLASS_COMPONENT = "class";
    const HOST_ROOT = "root";

    // Effect tags
    const PLACEMENT = 1;
    const DELETION = 2;
    const UPDATE = 3;

    const ENOUGH_TIME = 1;

    // Global state
    const updateQueue = [];
    let nextUnitOfWork = null;
    let pendingCommit = null;

    function render(elements, containerDom) {
        // Command Pattern: Schedules the rendering of elements into the container DOM.
        updateQueue.push({
            from: HOST_ROOT,
            dom: containerDom,
            newProps: { children: elements }
        });
        requestIdleCallback(performWork);
    }

    function scheduleUpdate(instance, partialState) {
        // Command Pattern: Schedules a state update for a class component instance.
        updateQueue.push({
            from: CLASS_COMPONENT,
            instance: instance,
            partialState: partialState
        });
        requestIdleCallback(performWork);
    }
    //#endregion Command Pattern - reconciler.js

    // ...existing code...
}
//#endregion Factory Pattern