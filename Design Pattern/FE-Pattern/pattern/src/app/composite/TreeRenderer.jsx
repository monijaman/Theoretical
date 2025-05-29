'use client';

import { useEffect, useState } from 'react';
import { UILeaf } from './UILeaf';
import { UIComposite } from './UIComposite';

export default function TreeRenderer() {
  const [treeOutput, setTreeOutput] = useState('');

  useEffect(() => {
    // Building component tree
    const button = new UILeaf('Button');
    const input = new UILeaf('Input');
    const header = new UILeaf('Header');

    const form = new UIComposite('Form');
    form.add(input);
    form.add(button);

    const card = new UIComposite('Card');
    card.add(header);
    card.add(form);

    const app = new UIComposite('App');
    app.add(card);
    app.add(new UILeaf('Footer'));

    setTreeOutput(app.render());
  }, []);

  return (
    <div className="p-6 text-black">
      <h1 className="text-xl font-bold mb-4">UI Component Tree</h1>
      <pre className="bg-gray-100 p-4 rounded whitespace-pre-wrap text-sm">
        {treeOutput}
      </pre>
    </div>
  );
}
