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

// Composite Pattern: Used to compose the UI tree with components like App and Story.
Didact.render(<App stories={stories} />, document.getElementById("root"));

/** ⬇️⬇️⬇️⬇️⬇️ 🌼Didact🌼 ⬇️⬇️⬇️⬇️⬇️ **/

function importFromBelow() {
    //#region element.js
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
    //#endregion
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
    //#endregion
    //#region component.js
    class Component {
        constructor(props) {
            this.props = props || {};
            this.state = this.state || {};
        }

        setState(partialState) {
            // Schedules a state update for the component.
            scheduleUpdate(this, partialState);
        }
    }

    function createInstance(fiber) {
        // Creates an instance of a class component.
        const instance = new fiber.type(fiber.props);
        instance.__fiber = fiber;
        return instance;
    }
    //#endregion
    //#region reconciler.js
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
        // Schedules the rendering of elements into the container DOM.
        updateQueue.push({
            from: HOST_ROOT,
            dom: containerDom,
            newProps: { children: elements }
        });
        requestIdleCallback(performWork);
    }

    function scheduleUpdate(instance, partialState) {
        // Schedules a state update for a class component instance.
        updateQueue.push({
            from: CLASS_COMPONENT,
            instance: instance,
            partialState: partialState
        });
        requestIdleCallback(performWork);
    }

    function performWork(deadline) {
        // Performs work units until the deadline is reached.
        workLoop(deadline);
        if (nextUnitOfWork || updateQueue.length > 0) {
            requestIdleCallback(performWork);
        }
    }

    function workLoop(deadline) {
        // Processes the work units in the fiber tree.
        if (!nextUnitOfWork) {
            resetNextUnitOfWork();
        }
        while (nextUnitOfWork) {
            nextUnitOfWork = performUnitOfWork(nextUnitOfWork);
        }
        if (pendingCommit) {
            commitAllWork(pendingCommit);
        }
    }

    function resetNextUnitOfWork() {
        // Resets the next unit of work based on the update queue.
        const update = updateQueue.shift();
        if (!update) {
            return;
        }

        // Copy the setState parameter from the update payload to the corresponding fiber
        if (update.partialState) {
            update.instance.__fiber.partialState = update.partialState;
        }

        const root =
            update.from == HOST_ROOT
                ? update.dom._rootContainerFiber
                : getRoot(update.instance.__fiber);

        nextUnitOfWork = {
            tag: HOST_ROOT,
            stateNode: update.dom || root.stateNode,
            props: update.newProps || root.props,
            alternate: root
        };
    }

    function getRoot(fiber) {
        // Retrieves the root fiber of the fiber tree.
        let node = fiber;
        while (node.parent) {
            node = node.parent;
        }
        return node;
    }

    function performUnitOfWork(wipFiber) {
        // Performs a single unit of work for the given fiber.
        beginWork(wipFiber);
        if (wipFiber.child) {
            return wipFiber.child;
        }

        // No child, we call completeWork until we find a sibling
        let uow = wipFiber;
        while (uow) {
            completeWork(uow);
            if (uow.sibling) {
                // Sibling needs to beginWork
                return uow.sibling;
            }
            uow = uow.parent;
        }
    }

    function beginWork(wipFiber) {
        // Begins work on a fiber by updating its state or creating its DOM node.
        if (wipFiber.tag == CLASS_COMPONENT) {
            updateClassComponent(wipFiber);
        } else {
            updateHostComponent(wipFiber);
        }
    }

    function updateHostComponent(wipFiber) {
        // Updates a host component fiber by creating its DOM node and reconciling its children.
        if (!wipFiber.stateNode) {
            wipFiber.stateNode = createDomElement(wipFiber);
        }

        const newChildElements = wipFiber.props.children;
        reconcileChildrenArray(wipFiber, newChildElements);
    }

    function updateClassComponent(wipFiber) {
        // Updates a class component fiber by calling its render method and reconciling its children.
        let instance = wipFiber.stateNode;
        if (instance == null) {
            // Call class constructor
            instance = wipFiber.stateNode = createInstance(wipFiber);
        } else if (wipFiber.props == instance.props && !wipFiber.partialState) {
            // No need to render, clone children from last time
            cloneChildFibers(wipFiber);
            return;
        }

        instance.props = wipFiber.props;
        instance.state = Object.assign({}, instance.state, wipFiber.partialState);
        wipFiber.partialState = null;

        const newChildElements = wipFiber.stateNode.render();
        reconcileChildrenArray(wipFiber, newChildElements);
    }

    function arrify(val) {
        // Converts a value into an array if it is not already an array.
        return val == null ? [] : Array.isArray(val) ? val : [val];
    }

    function reconcileChildrenArray(wipFiber, newChildElements) {
        // Reconciles the children of a fiber with the new child elements.
        const elements = arrify(newChildElements);

        let index = 0;
        let oldFiber = wipFiber.alternate ? wipFiber.alternate.child : null;
        let newFiber = null;
        while (index < elements.length || oldFiber != null) {
            const prevFiber = newFiber;
            const element = index < elements.length && elements[index];
            const sameType = oldFiber && element && element.type == oldFiber.type;

            if (sameType) {
                newFiber = {
                    type: oldFiber.type,
                    tag: oldFiber.tag,
                    stateNode: oldFiber.stateNode,
                    props: element.props,
                    parent: wipFiber,
                    alternate: oldFiber,
                    partialState: oldFiber.partialState,
                    effectTag: UPDATE
                };
            }

            if (element && !sameType) {
                newFiber = {
                    type: element.type,
                    tag:
                        typeof element.type === "string" ? HOST_COMPONENT : CLASS_COMPONENT,
                    props: element.props,
                    parent: wipFiber,
                    effectTag: PLACEMENT
                };
            }

            if (oldFiber && !sameType) {
                oldFiber.effectTag = DELETION;
                wipFiber.effects = wipFiber.effects || [];
                wipFiber.effects.push(oldFiber);
            }

            if (oldFiber) {
                oldFiber = oldFiber.sibling;
            }

            if (index == 0) {
                wipFiber.child = newFiber;
            } else if (prevFiber && element) {
                prevFiber.sibling = newFiber;
            }

            index++;
        }
    }

    function cloneChildFibers(parentFiber) {
        // Clones the child fibers of a parent fiber.
        const oldFiber = parentFiber.alternate;
        if (!oldFiber.child) {
            return;
        }

        let oldChild = oldFiber.child;
        let prevChild = null;
        while (oldChild) {
            const newChild = {
                type: oldChild.type,
                tag: oldChild.tag,
                stateNode: oldChild.stateNode,
                props: oldChild.props,
                partialState: oldChild.partialState,
                alternate: oldChild,
                parent: parentFiber
            };
            if (prevChild) {
                prevChild.sibling = newChild;
            } else {
                parentFiber.child = newChild;
            }
            prevChild = newChild;
            oldChild = oldChild.sibling;
        }
    }

    function completeWork(fiber) {
        // Completes work on a fiber and propagates its effects to its parent.
        if (fiber.tag == CLASS_COMPONENT) {
            fiber.stateNode.__fiber = fiber;
        }

        if (fiber.parent) {
            const childEffects = fiber.effects || [];
            const thisEffect = fiber.effectTag != null ? [fiber] : [];
            const parentEffects = fiber.parent.effects || [];
            fiber.parent.effects = parentEffects.concat(childEffects, thisEffect);
        } else {
            pendingCommit = fiber;
        }
    }

    function commitAllWork(fiber) {
        // Commits all the effects of a fiber to the DOM.
        fiber.effects.forEach(f => {
            commitWork(f);
        });
        fiber.stateNode._rootContainerFiber = fiber;
        nextUnitOfWork = null;
        pendingCommit = null;
    }

    function commitWork(fiber) {
        // Commits a single fiber's effect to the DOM.
        if (fiber.tag == HOST_ROOT) {
            return;
        }

        let domParentFiber = fiber.parent;
        while (domParentFiber.tag == CLASS_COMPONENT) {
            domParentFiber = domParentFiber.parent;
        }
        const domParent = domParentFiber.stateNode;

        if (fiber.effectTag == PLACEMENT && fiber.tag == HOST_COMPONENT) {
            domParent.appendChild(fiber.stateNode);
        } else if (fiber.effectTag == UPDATE) {
            updateDomProperties(fiber.stateNode, fiber.alternate.props, fiber.props);
        } else if (fiber.effectTag == DELETION) {
            commitDeletion(fiber, domParent);
        }
    }

    function commitDeletion(fiber, domParent) {
        // Commits the deletion of a fiber's DOM node.
        let node = fiber;
        while (true) {
            if (node.tag == CLASS_COMPONENT) {
                node = node.child;
                continue;
            }
            domParent.removeChild(node.stateNode);
            while (node != fiber && !node.sibling) {
                node = node.parent;
            }
            if (node == fiber) {
                return;
            }
            node = node.sibling;
        }
    }
    //#endregion
    return {
        createElement,
        render,
        Component
    };
}
