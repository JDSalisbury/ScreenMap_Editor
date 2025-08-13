import React, { useState, useEffect } from "react";
import { ReactFlow, Background, Controls } from "reactflow";
import "reactflow/dist/style.css";
import { MarkerType } from "reactflow";
import { applyNodeChanges, applyEdgeChanges } from "reactflow";
import screensData from "./screens.json";

function generateFlowElements(mapData) {
  const nodes = [];
  const edges = [];

  Object.entries(mapData).forEach(([screenId, screen], idx) => {
    const row = Math.floor(idx / 4);
    const col = idx % 4;
    
    nodes.push({
      id: screenId,
      position: { x: 200 * col, y: 150 * row },
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
          markerEnd: {
            type: MarkerType.ArrowClosed,
          },
        });
      }
      
      if (trigger.options) {
        trigger.options.forEach((option, optIdx) => {
          if (option.next_screen) {
            edges.push({
              id: `${screenId}-${dir}-${optIdx}-${option.next_screen}`,
              source: screenId,
              target: option.next_screen,
              label: `${dir}:${optIdx}`,
              type: "smoothstep",
              style: { stroke: '#ff6b6b', strokeDasharray: '5,5' },
              markerEnd: {
                type: MarkerType.ArrowClosed,
              },
            });
          }
        });
      }
    });
  });

  return { nodes, edges };
}

function App() {
  const [screens, setScreens] = useState(screensData);
  const [currentScreen, setCurrentScreen] = useState("start");
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);

  useEffect(() => {
    const { nodes: newNodes, edges: newEdges } = generateFlowElements(screens);
    setNodes(newNodes);
    setEdges(newEdges);
  }, [screens]);

  const handleNodeClick = (_, node) => {
    setCurrentScreen(node.id);
  };

  const updateScreen = (screenId, updates) => {
    setScreens(prev => ({
      ...prev,
      [screenId]: {
        ...prev[screenId],
        ...updates
      }
    }));
  };

  const updateScreenProperty = (screenId, path, value) => {
    setScreens(prev => {
      const newScreens = { ...prev };
      const screen = { ...newScreens[screenId] };
      
      if (path.includes('.')) {
        const keys = path.split('.');
        let current = screen;
        for (let i = 0; i < keys.length - 1; i++) {
          if (!current[keys[i]]) current[keys[i]] = {};
          current[keys[i]] = { ...current[keys[i]] };
          current = current[keys[i]];
        }
        current[keys[keys.length - 1]] = value;
      } else {
        screen[path] = value;
      }
      
      newScreens[screenId] = screen;
      return newScreens;
    });
  };

  const addTrigger = (screenId, direction) => {
    const newTrigger = {
      message: "",
      next_screen: ""
    };
    updateScreenProperty(screenId, `triggers.${direction}`, newTrigger);
  };

  const deleteTrigger = (screenId, direction) => {
    setScreens(prev => {
      const newScreens = { ...prev };
      const screen = { ...newScreens[screenId] };
      const triggers = { ...screen.triggers };
      delete triggers[direction];
      screen.triggers = triggers;
      newScreens[screenId] = screen;
      return newScreens;
    });
  };

  const updateTrigger = (screenId, direction, property, value) => {
    updateScreenProperty(screenId, `triggers.${direction}.${property}`, value);
  };

  const addInspectOption = (screenId) => {
    if (!screens[screenId].triggers.inspect) {
      updateScreenProperty(screenId, 'triggers.inspect', { message: "", options: [] });
    }
    
    const currentOptions = screens[screenId]?.triggers?.inspect?.options || [];
    const newOption = {
      label: "",
      message: ""
    };
    updateScreenProperty(screenId, 'triggers.inspect.options', [...currentOptions, newOption]);
  };

  const updateInspectOption = (screenId, optionIndex, property, value) => {
    const currentOptions = screens[screenId]?.triggers?.inspect?.options || [];
    const newOptions = [...currentOptions];
    newOptions[optionIndex] = { ...newOptions[optionIndex], [property]: value };
    updateScreenProperty(screenId, 'triggers.inspect.options', newOptions);
  };

  const deleteInspectOption = (screenId, optionIndex) => {
    const currentOptions = screens[screenId]?.triggers?.inspect?.options || [];
    const newOptions = currentOptions.filter((_, index) => index !== optionIndex);
    updateScreenProperty(screenId, 'triggers.inspect.options', newOptions);
  };

  const addAdditionalMessage = (screenId, optionIndex, interactionNumber) => {
    const option = screens[screenId]?.triggers?.inspect?.options?.[optionIndex];
    if (!option) return;
    
    const newAdditionalMessages = {
      ...option.additional_message,
      [interactionNumber]: { message: "" }
    };
    updateInspectOption(screenId, optionIndex, 'additional_message', newAdditionalMessages);
  };

  const updateAdditionalMessage = (screenId, optionIndex, interactionNumber, property, value) => {
    const option = screens[screenId]?.triggers?.inspect?.options?.[optionIndex];
    if (!option) return;
    
    const newAdditionalMessages = {
      ...option.additional_message,
      [interactionNumber]: {
        ...option.additional_message?.[interactionNumber],
        [property]: value
      }
    };
    updateInspectOption(screenId, optionIndex, 'additional_message', newAdditionalMessages);
  };

  const deleteAdditionalMessage = (screenId, optionIndex, interactionNumber) => {
    const option = screens[screenId]?.triggers?.inspect?.options?.[optionIndex];
    if (!option) return;
    
    const newAdditionalMessages = { ...option.additional_message };
    delete newAdditionalMessages[interactionNumber];
    updateInspectOption(screenId, optionIndex, 'additional_message', Object.keys(newAdditionalMessages).length > 0 ? newAdditionalMessages : undefined);
  };

  const createNewScreen = () => {
    const screenId = prompt("Enter new screen ID:");
    if (!screenId || screens[screenId]) {
      alert("Invalid or duplicate screen ID.");
      return;
    }

    const newScreen = {
      background: "",
      triggers: {}
    };

    setScreens(prev => ({
      ...prev,
      [screenId]: newScreen
    }));
    setCurrentScreen(screenId);
  };

  const deleteScreen = (screenId) => {
    if (Object.keys(screens).length <= 1) {
      alert("Cannot delete the last screen.");
      return;
    }

    if (window.confirm(`Delete screen "${screenId}"?`)) {
      const { [screenId]: deleted, ...remaining } = screens;
      setScreens(remaining);
      
      if (currentScreen === screenId) {
        setCurrentScreen(Object.keys(remaining)[0]);
      }
    }
  };

  const saveToFile = () => {
    const dataStr = JSON.stringify(screens, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'screens.json';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ display: "flex", width: "100vw", height: "100vh" }}>
      {/* Mini-map Panel */}
      <div style={{ width: "30%", borderRight: "1px solid #ccc" }}>
        <div style={{ padding: "10px", borderBottom: "1px solid #ccc", backgroundColor: "#f5f5f5" }}>
          <h3 style={{ margin: 0 }}>Screen Map</h3>
        </div>
        <div style={{ height: "calc(100% - 60px)" }}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={(changes) =>
              setNodes((nds) => applyNodeChanges(changes, nds))
            }
            onEdgesChange={(changes) =>
              setEdges((eds) => applyEdgeChanges(changes, eds))
            }
            onNodeClick={handleNodeClick}
            fitView
            attributionPosition="bottom-left"
          >
            <Background />
            <Controls />
          </ReactFlow>
        </div>
      </div>

      {/* Screen Editor Panel */}
      <div style={{ width: "50%", borderRight: "1px solid #ccc" }}>
        <div style={{ padding: "10px", borderBottom: "1px solid #ccc", backgroundColor: "#f5f5f5" }}>
          <h3 style={{ margin: 0 }}>Screen Editor: {currentScreen}</h3>
        </div>
        <div style={{ padding: "20px", height: "calc(100% - 60px)", overflowY: "auto" }}>
          {screens[currentScreen] ? (
            <div>
              {/* Background Editor */}
              <div style={{ marginBottom: "20px" }}>
                <h4>Background</h4>
                <input 
                  type="text" 
                  value={screens[currentScreen].background || ""} 
                  onChange={(e) => updateScreen(currentScreen, { background: e.target.value })}
                  style={{ width: "100%", padding: "8px", border: "1px solid #ddd", borderRadius: "4px" }}
                  placeholder="Background image path"
                />
              </div>

              {/* Key Item Unlocks Editor */}
              <div style={{ marginBottom: "20px" }}>
                <h4>Key Item Unlocks</h4>
                <div style={{ border: "1px solid #ddd", borderRadius: "4px", padding: "15px" }}>
                  {Object.entries(screens[currentScreen].key_item_unlocks || {}).map(([direction, items]) => (
                    <div key={direction} style={{ marginBottom: "10px" }}>
                      <strong>{direction}:</strong> 
                      <input 
                        type="text" 
                        value={items.join(", ")} 
                        onChange={(e) => {
                          const newItems = e.target.value.split(",").map(item => item.trim()).filter(item => item);
                          updateScreenProperty(currentScreen, `key_item_unlocks.${direction}`, newItems);
                        }}
                        style={{ marginLeft: "10px", padding: "4px", border: "1px solid #ccc", borderRadius: "3px", width: "200px" }}
                        placeholder="comma,separated,items"
                      />
                    </div>
                  ))}
                  <button 
                    onClick={() => {
                      const direction = prompt("Direction (up/down/left/right):");
                      if (direction) {
                        updateScreenProperty(currentScreen, `key_item_unlocks.${direction}`, []);
                      }
                    }}
                    style={{ padding: "4px 8px", backgroundColor: "#4caf50", color: "white", border: "none", borderRadius: "3px", fontSize: "12px" }}
                  >
                    + Add Direction
                  </button>
                </div>
              </div>

              {/* Triggers Editor */}
              <div style={{ marginBottom: "20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                  <h4 style={{ margin: 0 }}>Triggers</h4>
                  <select 
                    onChange={(e) => {
                      if (e.target.value) {
                        addTrigger(currentScreen, e.target.value);
                        e.target.value = "";
                      }
                    }}
                    style={{ padding: "4px 8px", border: "1px solid #ddd", borderRadius: "3px" }}
                  >
                    <option value="">+ Add Trigger</option>
                    {["up", "down", "left", "right", "inspect"].filter(dir => 
                      !screens[currentScreen].triggers?.[dir]
                    ).map(dir => (
                      <option key={dir} value={dir}>{dir}</option>
                    ))}
                  </select>
                </div>

                <div style={{ border: "1px solid #ddd", borderRadius: "4px", padding: "15px" }}>
                  {Object.entries(screens[currentScreen].triggers || {}).map(([direction, trigger]) => (
                    <div key={direction} style={{ 
                      marginBottom: "20px", 
                      padding: "15px", 
                      backgroundColor: "#f9f9f9", 
                      borderRadius: "4px",
                      border: "1px solid #e0e0e0"
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" }}>
                        <h5 style={{ margin: 0, color: "#333", textTransform: "capitalize" }}>{direction} Trigger</h5>
                        <button
                          onClick={() => deleteTrigger(currentScreen, direction)}
                          style={{ 
                            padding: "4px 8px", 
                            backgroundColor: "#f44336", 
                            color: "white", 
                            border: "none", 
                            borderRadius: "3px", 
                            fontSize: "12px" 
                          }}
                        >
                          Delete
                        </button>
                      </div>
                      
                      {/* Basic Trigger Properties */}
                      <div style={{ marginBottom: "10px" }}>
                        <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>Message:</label>
                        <textarea 
                          value={trigger.message || ""} 
                          onChange={(e) => updateTrigger(currentScreen, direction, 'message', e.target.value)}
                          style={{ 
                            width: "100%", 
                            padding: "8px", 
                            border: "1px solid #ddd", 
                            borderRadius: "3px",
                            resize: "vertical",
                            minHeight: "60px"
                          }}
                          placeholder="Enter trigger message"
                        />
                      </div>

                      <div style={{ display: "flex", gap: "15px", marginBottom: "10px" }}>
                        <div style={{ flex: 1 }}>
                          <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>Next Screen:</label>
                          <select 
                            value={trigger.next_screen || ""} 
                            onChange={(e) => updateTrigger(currentScreen, direction, 'next_screen', e.target.value)}
                            style={{ width: "100%", padding: "6px", border: "1px solid #ddd", borderRadius: "3px" }}
                          >
                            <option value="">None</option>
                            {Object.keys(screens).map(screenId => (
                              <option key={screenId} value={screenId}>{screenId}</option>
                            ))}
                          </select>
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <label>
                            <input 
                              type="checkbox" 
                              checked={trigger.hidden || false}
                              onChange={(e) => updateTrigger(currentScreen, direction, 'hidden', e.target.checked || undefined)}
                              style={{ marginRight: "5px" }}
                            />
                            Hidden
                          </label>
                        </div>
                      </div>

                      {direction === 'inspect' && (
                        <div style={{ marginTop: "15px" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                            <strong>Inspect Options:</strong>
                            <button 
                              onClick={() => addInspectOption(currentScreen)}
                              style={{ 
                                padding: "4px 8px", 
                                backgroundColor: "#2196f3", 
                                color: "white", 
                                border: "none", 
                                borderRadius: "3px", 
                                fontSize: "12px" 
                              }}
                            >
                              + Add Option
                            </button>
                          </div>
                          
                          {(trigger.options || []).map((option, optIdx) => (
                            <div key={optIdx} style={{ 
                              marginBottom: "15px", 
                              padding: "12px", 
                              backgroundColor: "#fff", 
                              border: "1px solid #ddd", 
                              borderRadius: "4px" 
                            }}>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                                <strong>Option {optIdx + 1}</strong>
                                <button
                                  onClick={() => deleteInspectOption(currentScreen, optIdx)}
                                  style={{ 
                                    padding: "2px 6px", 
                                    backgroundColor: "#f44336", 
                                    color: "white", 
                                    border: "none", 
                                    borderRadius: "3px", 
                                    fontSize: "11px" 
                                  }}
                                >
                                  ×
                                </button>
                              </div>
                              
                              <div style={{ marginBottom: "8px" }}>
                                <label style={{ display: "block", marginBottom: "3px", fontSize: "13px", fontWeight: "bold" }}>Label:</label>
                                <input 
                                  type="text" 
                                  value={option.label || ""} 
                                  onChange={(e) => updateInspectOption(currentScreen, optIdx, 'label', e.target.value)}
                                  style={{ width: "100%", padding: "4px", border: "1px solid #ccc", borderRadius: "3px" }}
                                  placeholder="Option label"
                                />
                              </div>

                              <div style={{ marginBottom: "8px" }}>
                                <label style={{ display: "block", marginBottom: "3px", fontSize: "13px", fontWeight: "bold" }}>Message:</label>
                                <textarea 
                                  value={option.message || ""} 
                                  onChange={(e) => updateInspectOption(currentScreen, optIdx, 'message', e.target.value)}
                                  style={{ 
                                    width: "100%", 
                                    padding: "4px", 
                                    border: "1px solid #ccc", 
                                    borderRadius: "3px",
                                    resize: "vertical",
                                    minHeight: "50px"
                                  }}
                                  placeholder="Option message"
                                />
                              </div>

                              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "8px" }}>
                                <div>
                                  <label style={{ display: "block", marginBottom: "3px", fontSize: "13px", fontWeight: "bold" }}>TP Cost:</label>
                                  <input 
                                    type="number" 
                                    value={option.tp_cost || ""} 
                                    onChange={(e) => updateInspectOption(currentScreen, optIdx, 'tp_cost', e.target.value ? parseInt(e.target.value) : undefined)}
                                    style={{ width: "100%", padding: "4px", border: "1px solid #ccc", borderRadius: "3px" }}
                                    placeholder="0"
                                  />
                                </div>

                                <div>
                                  <label style={{ display: "block", marginBottom: "3px", fontSize: "13px", fontWeight: "bold" }}>Next Screen:</label>
                                  <select 
                                    value={option.next_screen || ""} 
                                    onChange={(e) => updateInspectOption(currentScreen, optIdx, 'next_screen', e.target.value || undefined)}
                                    style={{ width: "100%", padding: "4px", border: "1px solid #ccc", borderRadius: "3px" }}
                                  >
                                    <option value="">None</option>
                                    {Object.keys(screens).map(screenId => (
                                      <option key={screenId} value={screenId}>{screenId}</option>
                                    ))}
                                  </select>
                                </div>
                              </div>

                              <div style={{ display: "flex", gap: "15px", alignItems: "center" }}>
                                <label>
                                  <input 
                                    type="checkbox" 
                                    checked={option.once || false}
                                    onChange={(e) => updateInspectOption(currentScreen, optIdx, 'once', e.target.checked || undefined)}
                                    style={{ marginRight: "5px" }}
                                  />
                                  Once only
                                </label>
                                
                                <label>
                                  <input 
                                    type="checkbox" 
                                    checked={!!option.grants_item}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        updateInspectOption(currentScreen, optIdx, 'grants_item', { id: "", type: "key" });
                                      } else {
                                        updateInspectOption(currentScreen, optIdx, 'grants_item', undefined);
                                      }
                                    }}
                                    style={{ marginRight: "5px" }}
                                  />
                                  Grants Item
                                </label>
                              </div>

                              {option.grants_item && (
                                <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "10px", marginTop: "8px", padding: "8px", backgroundColor: "#f0f8ff", borderRadius: "3px" }}>
                                  <div>
                                    <label style={{ display: "block", marginBottom: "3px", fontSize: "12px", fontWeight: "bold" }}>Item ID:</label>
                                    <input 
                                      type="text" 
                                      value={option.grants_item.id || ""} 
                                      onChange={(e) => updateInspectOption(currentScreen, optIdx, 'grants_item', { ...option.grants_item, id: e.target.value })}
                                      style={{ width: "100%", padding: "3px", border: "1px solid #ccc", borderRadius: "3px", fontSize: "12px" }}
                                      placeholder="item_id"
                                    />
                                  </div>
                                  <div>
                                    <label style={{ display: "block", marginBottom: "3px", fontSize: "12px", fontWeight: "bold" }}>Type:</label>
                                    <select 
                                      value={option.grants_item.type || "key"} 
                                      onChange={(e) => updateInspectOption(currentScreen, optIdx, 'grants_item', { ...option.grants_item, type: e.target.value })}
                                      style={{ width: "100%", padding: "3px", border: "1px solid #ccc", borderRadius: "3px", fontSize: "12px" }}
                                    >
                                      <option value="key">key</option>
                                      <option value="item">item</option>
                                      <option value="tool">tool</option>
                                    </select>
                                  </div>
                                </div>
                              )}

                              {/* Additional Messages Section */}
                              {option.additional_message && Object.keys(option.additional_message).length > 0 && (
                                <div style={{ marginTop: "15px", padding: "10px", backgroundColor: "#fff9e6", borderRadius: "4px", border: "1px solid #ffe066" }}>
                                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                                    <strong style={{ fontSize: "13px" }}>Progressive Messages:</strong>
                                  </div>
                                  
                                  {Object.entries(option.additional_message || {}).sort(([a], [b]) => parseInt(a) - parseInt(b)).map(([interactionNum, additionalMsg]) => (
                                    <div key={interactionNum} style={{ 
                                      marginBottom: "10px", 
                                      padding: "8px", 
                                      backgroundColor: "#fff", 
                                      border: "1px solid #ddd", 
                                      borderRadius: "3px" 
                                    }}>
                                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                                        <strong style={{ fontSize: "12px" }}>Interaction #{interactionNum}</strong>
                                        <button
                                          onClick={() => deleteAdditionalMessage(currentScreen, optIdx, interactionNum)}
                                          style={{ 
                                            padding: "1px 4px", 
                                            backgroundColor: "#f44336", 
                                            color: "white", 
                                            border: "none", 
                                            borderRadius: "2px", 
                                            fontSize: "10px" 
                                          }}
                                        >
                                          ×
                                        </button>
                                      </div>
                                      
                                      <div style={{ marginBottom: "6px" }}>
                                        <label style={{ display: "block", marginBottom: "2px", fontSize: "11px", fontWeight: "bold" }}>Message:</label>
                                        <textarea 
                                          value={additionalMsg.message || ""} 
                                          onChange={(e) => updateAdditionalMessage(currentScreen, optIdx, interactionNum, 'message', e.target.value)}
                                          style={{ 
                                            width: "100%", 
                                            padding: "3px", 
                                            border: "1px solid #ccc", 
                                            borderRadius: "2px",
                                            fontSize: "11px",
                                            resize: "vertical",
                                            minHeight: "40px"
                                          }}
                                          placeholder="Progressive message"
                                        />
                                      </div>

                                      {additionalMsg.tp_cost !== undefined && (
                                        <div style={{ marginBottom: "6px" }}>
                                          <label style={{ display: "block", marginBottom: "2px", fontSize: "11px", fontWeight: "bold" }}>TP Cost:</label>
                                          <input 
                                            type="number" 
                                            value={additionalMsg.tp_cost || ""} 
                                            onChange={(e) => updateAdditionalMessage(currentScreen, optIdx, interactionNum, 'tp_cost', e.target.value ? parseInt(e.target.value) : undefined)}
                                            style={{ width: "60px", padding: "2px", border: "1px solid #ccc", borderRadius: "2px", fontSize: "11px" }}
                                          />
                                        </div>
                                      )}

                                      {additionalMsg.next_screen && (
                                        <div style={{ marginBottom: "6px" }}>
                                          <label style={{ display: "block", marginBottom: "2px", fontSize: "11px", fontWeight: "bold" }}>Next Screen:</label>
                                          <select 
                                            value={additionalMsg.next_screen || ""} 
                                            onChange={(e) => updateAdditionalMessage(currentScreen, optIdx, interactionNum, 'next_screen', e.target.value || undefined)}
                                            style={{ width: "120px", padding: "2px", border: "1px solid #ccc", borderRadius: "2px", fontSize: "11px" }}
                                          >
                                            <option value="">None</option>
                                            {Object.keys(screens).map(screenId => (
                                              <option key={screenId} value={screenId}>{screenId}</option>
                                            ))}
                                          </select>
                                        </div>
                                      )}

                                      <div style={{ display: "flex", gap: "10px", marginTop: "6px" }}>
                                        <label style={{ fontSize: "10px" }}>
                                          <input 
                                            type="checkbox" 
                                            checked={additionalMsg.tp_cost !== undefined}
                                            onChange={(e) => {
                                              if (e.target.checked) {
                                                updateAdditionalMessage(currentScreen, optIdx, interactionNum, 'tp_cost', 2);
                                              } else {
                                                updateAdditionalMessage(currentScreen, optIdx, interactionNum, 'tp_cost', undefined);
                                              }
                                            }}
                                            style={{ marginRight: "3px" }}
                                          />
                                          Has TP Cost
                                        </label>
                                        
                                        <label style={{ fontSize: "10px" }}>
                                          <input 
                                            type="checkbox" 
                                            checked={!!additionalMsg.next_screen}
                                            onChange={(e) => {
                                              if (e.target.checked) {
                                                updateAdditionalMessage(currentScreen, optIdx, interactionNum, 'next_screen', "");
                                              } else {
                                                updateAdditionalMessage(currentScreen, optIdx, interactionNum, 'next_screen', undefined);
                                              }
                                            }}
                                            style={{ marginRight: "3px" }}
                                          />
                                          Navigate
                                        </label>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}

                              <div style={{ marginTop: "10px", display: "flex", gap: "10px" }}>
                                <button
                                  onClick={() => {
                                    const nextNum = Math.max(...Object.keys(option.additional_message || {}).map(n => parseInt(n)), 1) + 1;
                                    addAdditionalMessage(currentScreen, optIdx, nextNum.toString());
                                  }}
                                  style={{ 
                                    padding: "4px 8px", 
                                    backgroundColor: "#ff9800", 
                                    color: "white", 
                                    border: "none", 
                                    borderRadius: "3px", 
                                    fontSize: "11px" 
                                  }}
                                >
                                  + Add Progressive Message
                                </button>

                                {option.unlocks_direction !== undefined && (
                                  <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                                    <label style={{ fontSize: "11px", fontWeight: "bold" }}>Unlocks Direction:</label>
                                    <select 
                                      value={option.unlocks_direction || ""} 
                                      onChange={(e) => updateInspectOption(currentScreen, optIdx, 'unlocks_direction', e.target.value || undefined)}
                                      style={{ padding: "2px", border: "1px solid #ccc", borderRadius: "2px", fontSize: "11px" }}
                                    >
                                      <option value="">None</option>
                                      <option value="up">up</option>
                                      <option value="down">down</option>
                                      <option value="left">left</option>
                                      <option value="right">right</option>
                                    </select>
                                  </div>
                                )}

                                <label style={{ fontSize: "11px" }}>
                                  <input 
                                    type="checkbox" 
                                    checked={option.unlocks_direction !== undefined}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        updateInspectOption(currentScreen, optIdx, 'unlocks_direction', "up");
                                      } else {
                                        updateInspectOption(currentScreen, optIdx, 'unlocks_direction', undefined);
                                      }
                                    }}
                                    style={{ marginRight: "3px" }}
                                  />
                                  Unlocks Direction
                                </label>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <p>Screen not found</p>
          )}
        </div>
      </div>

      {/* Screen Navigator Panel */}
      <div style={{ width: "20%" }}>
        <div style={{ padding: "10px", borderBottom: "1px solid #ccc", backgroundColor: "#f5f5f5", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ margin: 0 }}>Screens</h3>
          <button 
            onClick={createNewScreen}
            style={{ 
              padding: "4px 8px", 
              fontSize: "12px", 
              backgroundColor: "#4caf50", 
              color: "white", 
              border: "none", 
              borderRadius: "3px", 
              cursor: "pointer" 
            }}
          >
            + New
          </button>
        </div>
        
        <div style={{ padding: "10px", borderBottom: "1px solid #ccc" }}>
          <button 
            onClick={saveToFile}
            style={{ 
              width: "100%", 
              padding: "8px", 
              backgroundColor: "#2196f3", 
              color: "white", 
              border: "none", 
              borderRadius: "4px", 
              cursor: "pointer",
              marginBottom: "10px"
            }}
          >
            💾 Save JSON
          </button>
        </div>
        
        <div style={{ padding: "10px", height: "calc(100% - 140px)", overflowY: "auto" }}>
          {Object.keys(screens).map(screenId => (
            <div 
              key={screenId}
              style={{ 
                display: "flex",
                alignItems: "center",
                padding: "8px", 
                margin: "5px 0",
                backgroundColor: currentScreen === screenId ? "#e3f2fd" : "#f9f9f9",
                border: "1px solid " + (currentScreen === screenId ? "#2196f3" : "#ddd"),
                borderRadius: "4px",
                cursor: "pointer"
              }}
            >
              <div 
                style={{ flex: 1 }}
                onClick={() => setCurrentScreen(screenId)}
              >
                {screenId}
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteScreen(screenId);
                }}
                style={{
                  marginLeft: "8px",
                  padding: "2px 6px",
                  fontSize: "12px",
                  backgroundColor: "#f44336",
                  color: "white",
                  border: "none",
                  borderRadius: "3px",
                  cursor: "pointer"
                }}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default App;
