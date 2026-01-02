import React, { useRef, useMemo } from 'react';
import ForceGraph2D, { ForceGraphMethods } from 'react-force-graph-2d';

// Mock data for the graph - eventually this comes from Neo4j
const genRandomTree = (N = 300, reverse = false) => {
    return {
        nodes: [...Array(N).keys()].map(i => ({ id: i, name: `Node ${i}`, val: Math.random() * 5 })),
        links: [...Array(N).keys()]
            .filter(id => id)
            .map(id => ({
                [reverse ? 'target' : 'source']: id,
                [reverse ? 'source' : 'target']: Math.round(Math.random() * (id - 1))
            }))
    };
};

export const GraphView: React.FC = () => {
    const fgRef = useRef<ForceGraphMethods>();
    const data = useMemo(() => genRandomTree(50), []);

    return (
        <div className="bg-white rounded-lg shadow-md overflow-hidden h-[600px] border border-gray-200">
            <ForceGraph2D
                ref={fgRef}
                graphData={data}
                nodeLabel="name"
                nodeColor={() => '#3b82f6'}
                linkColor={() => '#cbced1'}
                backgroundColor="#f8fafc"
                width={800} // Dynamic sizing would use a ResizeObserver
                height={600}
                onNodeClick={node => {
                    // Center/zoom on node
                    fgRef.current?.centerAt(node.x, node.y, 1000);
                    fgRef.current?.zoom(8, 2000);
                }}
            />
        </div>
    );
};
