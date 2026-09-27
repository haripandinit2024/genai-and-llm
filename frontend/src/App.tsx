import { useEffect, useState } from "react";

import { Sidebar } from "./components/Sidebar";
import { TopBar } from "./components/TopBar";
import { useAgents, useBackendHealth, usePresets } from "./hooks/useBackend";
import { useChat } from "./hooks/useChat";
import { BenchmarksPage } from "./pages/BenchmarksPage";
import { ChatPage } from "./pages/ChatPage";
import { DiffPage } from "./pages/DiffPage";
import { PresetsPage } from "./pages/PresetsPage";
import { VisualizerPage } from "./pages/VisualizerPage";
import type { TabKey, VizType } from "./types";

interface VizRequest {
  type: VizType;
  token: number;
}

export default function App() {
  const { agents, capabilities } = useAgents();
  const { health, state } = useBackendHealth();
  const { presets, categories, loading: presetsLoading, error: presetsError } = usePresets();

  const [selectedAgent, setSelectedAgent] = useState("code-agent");
  const [activeTab, setActiveTab] = useState<TabKey>("chat");
  const [splitMode, setSplitMode] = useState(false);
  const [vizRequest, setVizRequest] = useState<VizRequest>({ type: "sorting", token: 0 });

  const chat = useChat(selectedAgent);
  const agent = agents.find((item) => item.id === selectedAgent) ?? null;

  // Keep the selection valid once the agent catalogue arrives.
  useEffect(() => {
    if (agents.length > 0 && !agents.some((item) => item.id === selectedAgent)) {
      setSelectedAgent(agents[0].id);
    }
  }, [agents, selectedAgent]);

  const handleVisualize = (viz: VizType) => {
    setVizRequest((previous) => ({ type: viz, token: previous.token + 1 }));
    if (!splitMode) setActiveTab("visualizer");
  };

  const handleSelectPreset = (prompt: string, viz?: VizType) => {
    setActiveTab("chat");
    if (viz) setVizRequest((previous) => ({ type: viz, token: previous.token + 1 }));
    void chat.send(prompt);
  };

  const visualizer = (
    <VisualizerPage vizType={vizRequest.type} syncToken={vizRequest.token} />
  );

  return (
    <div className="app-container">
      <Sidebar
        activeTab={activeTab}
        splitMode={splitMode}
        agents={agents}
        capabilities={capabilities}
        selectedAgent={selectedAgent}
        messageCount={chat.messages.length}
        connection={state}
        health={health}
        onSelectTab={(tab) => {
          setActiveTab(tab);
          setSplitMode(false);
        }}
        onToggleSplit={() => setSplitMode((previous) => !previous)}
        onSelectAgent={setSelectedAgent}
        onClearConversation={chat.clearConversation}
      />

      <main className="main-area">
        <TopBar
          activeTab={activeTab}
          splitMode={splitMode}
          agent={agent}
          messageCount={chat.messages.length}
          health={health}
        />

        <div className="content-body">
          {splitMode ? (
            <div className="split-grid">
              <ChatPage
                agent={agent}
                presets={presets}
                chat={chat}
                onVisualize={handleVisualize}
                compact
              />
              {visualizer}
            </div>
          ) : (
            <>
              {activeTab === "chat" && (
                <ChatPage
                  agent={agent}
                  presets={presets}
                  chat={chat}
                  onVisualize={handleVisualize}
                />
              )}
              {activeTab === "visualizer" && visualizer}
              {activeTab === "performance" && <BenchmarksPage />}
              {activeTab === "diff" && <DiffPage />}
              {activeTab === "presets" && (
                <PresetsPage
                  presets={presets}
                  categories={categories}
                  loading={presetsLoading}
                  error={presetsError}
                  onSelectPreset={handleSelectPreset}
                />
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
