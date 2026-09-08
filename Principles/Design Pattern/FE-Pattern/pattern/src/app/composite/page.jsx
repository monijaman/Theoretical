import TreeRenderer from './TreeRenderer';

// This page demonstrates the Composite Pattern as a real-life example:
// In frontend development, UI layouts are often built as trees of components (e.g., panels, menus, buttons).
// The Composite Pattern allows you to treat both individual UI elements (leaves) and groups of elements (composites)
// uniformly, making it easier to render, traverse, or manipulate complex UI structures.

export default function UITreePage() {
  return (
    <div className="p-6 flex justify-center items-start min-h-screen bg-gray-50">
      <div className="bg-white shadow rounded-lg p-8 max-w-xl w-full">
        <h1 className="text-2xl font-bold mb-2">UI Component Tree Viewer</h1>
        <p className="mb-6 text-gray-600">
          Visualize your UI structure using the Composite Pattern. This tool helps you understand and debug nested UI hierarchies, such as menus, panels, and buttons.
        </p>
        <TreeRenderer />
      </div>
    </div>
  );
}
