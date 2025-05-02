import React, { useState } from "react";
import { ReactFlow, Background, Controls } from "reactflow";
import "reactflow/dist/style.css";
import gameMap from "./data/map";
import { MarkerType } from "reactflow";
import { applyNodeChanges, applyEdgeChanges } from "reactflow";

function generateFlowElements(mapData) {
  const nodes = [];
  const edges = [];

  Object.entries(mapData).forEach(([screenId, screen], idx) => {
    let y = 100;
    if (screen.triggers?.up) y -= 150;
    if (screen.triggers?.down) y += 150;

    nodes.push({
      id: screenId,
      position: { x: 250 * idx, y },
      data: { label: screenId },
      type: "default",
      draggable: true,
    });

    const triggers = screen.triggers || {};
    Object.entries(triggers).forEach(([dir, trigger]) => {
      if (trigger.next_screen) {
        edges.push({
          id: `${screenId}-${dir}-${trigger.next_screen}`,
          source: screenId,
          target: trigger.next_screen,
          label: dir,
          type: "smoothstep",
          animated: true,
          markerEnd: {
            type: MarkerType.ArrowClosed,
          },
        });
      }
    });
  });

  return { nodes, edges };
}

function App() {
  const { nodes: initialNodes, edges: initialEdges } =
    generateFlowElements(gameMap);

  const [nodes, setNodes] = useState(initialNodes);
  const [edges, setEdges] = useState(initialEdges);

  function handleAddNode() {
    const screenId = prompt("Enter a new screen ID:");
    if (!screenId || nodes.find((n) => n.id === screenId)) {
      alert("Invalid or duplicate screen ID.");
      return;
    }

    const newNode = {
      id: screenId,
      position: {
        x: Math.random() * 600,
        y: Math.random() * 400,
      },
      data: { label: screenId },
      type: "default",
      draggable: true,
    };

    setNodes((prev) => [...prev, newNode]);
  }

  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      <button
        style={{
          position: "absolute",
          top: 10,
          left: 10,
          zIndex: 10,
          padding: "6px 12px",
        }}
        onClick={handleAddNode}
      >
        ➕ Add Node
      </button>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={(changes) =>
          setNodes((nds) => applyNodeChanges(changes, nds))
        }
        onEdgesChange={(changes) =>
          setEdges((eds) => applyEdgeChanges(changes, eds))
        }
        fitView
      >
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  );
}

export default App;
