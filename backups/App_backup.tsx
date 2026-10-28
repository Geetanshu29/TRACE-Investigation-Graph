import { useMemo, useState, type ReactNode } from "react";

import {

  Activity, AlertTriangle, Bell, ChevronDown, ChevronRight, CircleHelp,

  Clock3, Database, FileSearch, FileText, Filter, Fingerprint, FolderOpen, GitBranch,

  LayoutDashboard, Network, Plus, Search, Settings2, Shield, ShieldCheck,

  Upload, Users, X, LoaderCircle,

} from "lucide-react";

import {

  Background, Controls, MiniMap, ReactFlow,

  type Edge, type Node,

} from "@xyflow/react";

import "@xyflow/react/dist/style.css";

import "./App.css";

type Entity = {

  id: string;

  label: string;

  kind: string;

  detail: string;

  evidence: string;

  source: string;

  x: number;

  y: number;

};

type Relationship = {

  id: string;

  source: string;

  target: string;

  label: string;

  evidence: string;

  status: string;

};

type AnalysisResponse = {

  document_id?: string;

  filename?: string;

  status?: string;

  character_count?: number;

  analyzed_characters?: number;

  truncated?: boolean;

  model?: string;

  entities?: Array<Record<string, unknown>>;

  relationships?: Array<Record<string, unknown>>;

  verification?: unknown;

  [key: string]: unknown;

};


type CombinedGraphResponse = {
  status?: string;
  source?: string;
  entities?: Array<Record<string, unknown>>;
  relationships?: Array<Record<string, unknown>>;
  entity_count?: number;
  relationship_count?: number;
};

const API_BASE = "http://127.0.0.1:8000";

const demoEntities: Entity[] = [

  { id: "a", label: "Person A", kind: "PERSON", detail: "Mentioned in sample case file CF-102", evidence: "Illustrative demo record only.", source: "Sample data", x: 330, y: 190 },

  { id: "b", label: "Person B", kind: "PERSON", detail: "Mentioned in sample case files CF-102 and CF-108", evidence: "Illustrative demo record only.", source: "Sample data", x: 610, y: 90 },

  { id: "c", label: "Company X", kind: "ORGANIZATION", detail: "Organization referenced in sample CF-102", evidence: "Illustrative demo record only.", source: "Sample data", x: 650, y: 300 },

  { id: "d", label: "Vehicle 01", kind: "VEHICLE", detail: "Vehicle reference extracted from sample CF-108", evidence: "Illustrative demo record only.", source: "Sample data", x: 920, y: 175 },

  { id: "e", label: "Location Z", kind: "LOCATION", detail: "Location mentioned in sample CF-102", evidence: "Illustrative demo record only.", source: "Sample data", x: 920, y: 370 },

  { id: "f", label: "Person C", kind: "PERSON", detail: "Mentioned in sample case file CF-108", evidence: "Illustrative demo record only.", source: "Sample data", x: 330, y: 400 },

];

const demoRelationships: Relationship[] = [

  { id: "ab", source: "a", target: "b", label: "MENTIONED WITH", evidence: "Illustrative demo relationship.", status: "demo" },

  { id: "ac", source: "a", target: "c", label: "REFERENCED WITH", evidence: "Illustrative demo relationship.", status: "demo" },

  { id: "bc", source: "b", target: "c", label: "ASSOCIATED IN FILE", evidence: "Illustrative demo relationship.", status: "demo" },

  { id: "bd", source: "b", target: "d", label: "REFERENCED WITH", evidence: "Illustrative demo relationship.", status: "demo" },

  { id: "ce", source: "c", target: "e", label: "MENTIONED WITH", evidence: "Illustrative demo relationship.", status: "demo" },

  { id: "fa", source: "f", target: "a", label: "SAME FILE", evidence: "Illustrative demo relationship.", status: "demo" },

];

const nav = [

  { label: "Overview", icon: LayoutDashboard },

  { label: "Investigations", icon: FolderOpen },

  { label: "Graph Explorer", icon: Network },

  { label: "Evidence Vault", icon: FileSearch },

  { label: "Entities", icon: Fingerprint },

];

function asString(value: unknown, fallback = ""): string {

  return typeof value === "string" && value.trim() ? value.trim() : fallback;

}

function normalizeAnalysis(data: AnalysisResponse): { entities: Entity[]; relationships: Relationship[] } {

  const rawEntities = Array.isArray(data.entities) ? data.entities : [];

  const entities: Entity[] = rawEntities.map((raw, index) => {

    const name = asString(raw.name, asString(raw.label, `Entity ${index + 1}`));

    const kind = asString(raw.type, asString(raw.kind, "OTHER")).toUpperCase();

    const id = asString(raw.id, `entity-${index + 1}`);

    const evidence = asString(raw.evidence, "No evidence quote returned by the model.");

    const source = asString(raw.source, asString(data.filename, "Uploaded document"));

    return {

      id, label: name, kind,

      detail: `${kind} extracted from ${source}`,

      evidence, source,

      x: 140 + (index % 3) * 260,

      y: 100 + Math.floor(index / 3) * 180,

    };

  });

  const resolveEntity = (value: unknown): string => {

    const candidate = asString(value);

    const byId = entities.find((entity) => entity.id === candidate);

    if (byId) return byId.id;

    const byName = entities.find((entity) => entity.label.toLowerCase() === candidate.toLowerCase());

    return byName?.id ?? "";

  };

  const rawRelationships = Array.isArray(data.relationships) ? data.relationships : [];

  const relationships: Relationship[] = rawRelationships.map((raw, index) => {

    const source = resolveEntity(raw.source_entity ?? raw.source ?? raw.from);

    const target = resolveEntity(raw.target_entity ?? raw.target ?? raw.to);

    return {

      id: asString(raw.id, `relationship-${index + 1}`),

      source,

      target,

      label: asString(raw.type, asString(raw.label, "CANDIDATE LINK")).toUpperCase(),

      evidence: asString(raw.evidence, "No evidence quote returned by the model."),

      status: asString(raw.status, "candidate"),

    };

  }).filter((relationship) =>

    relationship.source && relationship.target && relationship.source !== relationship.target

  );

  return { entities, relationships };

}

function App() {

  const [activeNav, setActiveNav] = useState("Overview");

  const [query, setQuery] = useState("");

  const [selected, setSelected] = useState("a");

  const [filter, setFilter] = useState("ALL");

  const [showEvidence, setShowEvidence] = useState(true);

  const [entities, setEntities] = useState<Entity[]>(demoEntities);

  const [relationships, setRelationships] = useState<Relationship[]>(demoRelationships);

  const [isDemo, setIsDemo] = useState(true);

  const [file, setFile] = useState<File | null>(null);

  const [busy, setBusy] = useState(false);

  const [graphBusy, setGraphBusy] = useState(false);

  const [error, setError] = useState("");

  const [notice, setNotice] = useState("Sample data only. All entities and relationships below are illustrative and are not real investigative findings.");

  const [analysisMeta, setAnalysisMeta] = useState<{ filename: string; model: string; characterCount: number } | null>(null);

  const visibleEntities = useMemo(() => entities.filter((entity) =>

    `${entity.label} ${entity.kind} ${entity.detail}`.toLowerCase().includes(query.toLowerCase())

    && (filter === "ALL" || entity.kind === filter)

  ), [entities, query, filter]);

  const nodes: Node[] = useMemo(() => visibleEntities.map((entity) => ({

    id: entity.id,

    position: { x: entity.x, y: entity.y },

    data: {

      label: (

        <div className={`entity-node ${entity.kind.toLowerCase()}`}>

          <span className="entity-kind">{entity.kind}</span>

          <strong>{entity.label}</strong>

          <span className="entity-caption">{isDemo ? "Demo entity" : "AI-extracted entity"}</span>

        </div>

      ),

    },

    type: "default",

    style: {

      width: 172,

      padding: 0,

      border: selected === entity.id ? "1px solid #67e8c0" : "1px solid #27364a",

      borderRadius: 12,

      background: "#101b2a",

      color: "#e2e8f0",

      boxShadow: selected === entity.id ? "0 0 0 2px #67e8c033" : "none",

    },

  })), [visibleEntities, selected, isDemo]);

  const visibleIds = new Set(visibleEntities.map((entity) => entity.id));

  const edges: Edge[] = useMemo(() => relationships

    .filter((relationship) => visibleIds.has(relationship.source) && visibleIds.has(relationship.target))

    .map((relationship) => ({

      id: relationship.id,

      source: relationship.source,

      target: relationship.target,

      label: relationship.label,

      animated: false,

      style: { stroke: "#5b9b91" },

      labelStyle: { fill: "#cbd5e1", fontSize: 10 },

      labelBgStyle: { fill: "#101b2a", fillOpacity: 0.95 },

    })), [relationships, visibleEntities]);

  const selectedEntity = entities.find((entity) => entity.id === selected) ?? entities[0];

  const connectedRelationships = relationships.filter((relationship) =>

    relationship.source === selectedEntity?.id || relationship.target === selectedEntity?.id

  );

  async function analyzeDocument() {

    if (!file) {

      setError("Pehle PDF ya TXT file select kar.");

      return;

    }

    setBusy(true);

    setError("");

    try {

      const formData = new FormData();

      formData.append("file", file);

      const response = await fetch(`${API_BASE}/api/documents/analyze`, {

        method: "POST",

        body: formData,

      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {

        throw new Error(asString(payload.detail, `Request failed (${response.status}).`));

      }

      const normalized = normalizeAnalysis(payload as AnalysisResponse);

      if (normalized.entities.length === 0) {

        throw new Error("API response mein entities nahi mili. Backend response/schema check kar.");

      }

      setEntities(normalized.entities);

      setRelationships(normalized.relationships);

      setSelected(normalized.entities[0].id);

      setFilter("ALL");

      setQuery("");

      setIsDemo(false);

      setAnalysisMeta({

        filename: asString(payload.filename, file.name),

        model: asString(payload.model, "Model not reported"),

        characterCount: Number(payload.analyzed_characters ?? payload.character_count ?? 0),

      });

      setNotice("AI-extracted candidate links only. Verify every quote against the uploaded source; a link is not proof of wrongdoing.");

      setActiveNav("Graph Explorer");

    } catch (err) {

      setError(err instanceof Error ? err.message : "Analysis failed. Backend server check kar.");

    } finally {

      setBusy(false);

    }

  }

  async function loadCombinedGraph() {
    setGraphBusy(true);
    setError("");
    try {
      const response = await fetch(`${API_BASE}/api/graph?limit=1000`);
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(asString(payload.detail, `Graph request failed (${response.status}).`));
      }

      const graph = payload as CombinedGraphResponse;
      const rawEntities = Array.isArray(graph.entities) ? graph.entities : [];
      const rawRelationships = Array.isArray(graph.relationships) ? graph.relationships : [];

      const loadedEntities: Entity[] = rawEntities.map((raw, index) => {
        const name = asString(raw.name, `Entity ${index + 1}`);
        const kind = asString(raw.type, "OTHER").toUpperCase();
        const docs = Array.isArray(raw.documents)
          ? raw.documents as Array<Record<string, unknown>>
          : [];
        const filenames = [...new Set(docs.map((doc) => asString(doc.filename)).filter(Boolean))];
        return {
          id: asString(raw.id, `graph-entity-${index + 1}`),
          label: name,
          kind,
          detail: filenames.length
            ? `Mentioned in ${filenames.length} saved document${filenames.length === 1 ? "" : "s"}`
            : "Stored entity from Neo4j",
          evidence: filenames.length
            ? `Source documents: ${filenames.join(", ")}`
            : "Entity stored in Neo4j. Retrieve its source document to review evidence.",
          source: "Neo4j graph",
          x: 140 + (index % 4) * 230,
          y: 100 + Math.floor(index / 4) * 170,
        };
      });

      const entityIds = new Set(loadedEntities.map((entity) => entity.id));
      const loadedRelationships: Relationship[] = rawRelationships.map((raw, index) => ({
        id: asString(raw.id, `graph-relationship-${index + 1}`),
        source: asString(raw.source),
        target: asString(raw.target),
        label: asString(raw.type, "RELATED_TO").toUpperCase(),
        evidence: asString(raw.evidence, "Evidence text was not returned by the graph API."),
        status: asString(raw.status, "candidate"),
      })).filter((relationship) =>
        entityIds.has(relationship.source)
        && entityIds.has(relationship.target)
        && relationship.source !== relationship.target
      );

      setEntities(loadedEntities);
      setRelationships(loadedRelationships);
      setSelected(loadedEntities[0]?.id ?? "");
      setFilter("ALL");
      setQuery("");
      setIsDemo(false);
      setAnalysisMeta(null);
      setNotice("Combined graph loaded from Neo4j. Relationships remain candidate leads; verify evidence against the original source documents.");
      setActiveNav("Graph Explorer");
      if (loadedEntities.length === 0) {
        setNotice("Neo4j returned no entities. Upload and analyze a document first.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load the combined Neo4j graph.");
    } finally {
      setGraphBusy(false);
    }
  }

  function resetDemo() {

    setEntities(demoEntities);

    setRelationships(demoRelationships);

    setSelected("a");

    setFilter("ALL");

    setQuery("");

    setIsDemo(true);

    setAnalysisMeta(null);

    setError("");

    setNotice("Sample data only. All entities and relationships below are illustrative and are not real investigative findings.");

  }

  return (

    <div className="app-shell">

      <aside className="sidebar">

        <div className="brand">

          <div className="brand-mark"><Network size={23} /></div>

          <div><strong>TRACE<span>.</span></strong><small>INVESTIGATIVE INTELLIGENCE</small></div>

        </div>

        <div className="workspace-label">WORKSPACE</div>

        <div className="workspace-switch"><Shield size={17} /><span>Investigation Unit</span><ChevronDown size={15} /></div>

        <div className="nav-label">ANALYZE</div>

        <nav>

          {nav.map(({ label, icon: Icon }) => (

            <button key={label} className={`nav-item ${activeNav === label ? "active" : ""}`} onClick={() => setActiveNav(label)}>

              <Icon size={18} /><span>{label}</span>

              {label === "Investigations" && <span className="nav-count">04</span>}

            </button>

          ))}

        </nav>

        <div className="nav-label tools-label">SYSTEM</div>

        <button className={`nav-item ${activeNav === "Activity Log" ? "active" : ""}`} onClick={() => setActiveNav("Activity Log")}><Activity size={18} /><span>Activity Log</span></button>

        <button className={`nav-item ${activeNav === "Settings" ? "active" : ""}`} onClick={() => setActiveNav("Settings")}><Settings2 size={18} /><span>Settings</span></button>

        <div className="sidebar-bottom">

          <div className="secure-indicator"><ShieldCheck size={17} /><div><strong>Local workspace</strong><small>{isDemo ? "Demo environment" : "Analysis loaded locally"}</small></div><span className="status-dot" /></div>

          <div className="profile"><div className="avatar">TA</div><div><strong>Test Analyst</strong><small>Investigation team</small></div><ChevronDown size={15} /></div>

        </div>

      </aside>

      <main className="main-area">

        <header className="topbar">

          <div className="breadcrumbs">Workspace <ChevronRight size={14} /> <strong>{activeNav}</strong></div>

          <div className="top-actions">

            <span className="environment-tag"><span /> {isDemo ? "DEMO ENVIRONMENT" : "AI ANALYSIS LOADED"}</span>

            <button className="icon-button" aria-label="Help"><CircleHelp size={18} /></button>

            <button className="icon-button" aria-label="Notifications"><Bell size={18} /></button>

            <div className="avatar small-avatar">TA</div>

          </div>

        </header>

        <section className="page-content">

          <div className="welcome-row">

            <div>

              <div className="eyebrow"><span className="live-dot" /> INTELLIGENCE WORKSPACE / {isDemo ? "DEMO" : "ANALYSIS"}</div>

              <h1>{activeNav === "Overview" ? "Investigation overview" : activeNav}</h1>

              <p>Explore documented connections. Verify every lead against its source.</p>

            </div>

            <button className="primary-button" onClick={() => setActiveNav("Investigations")}><Plus size={17} /> New investigation</button>

          </div>

          <div className="notice"><AlertTriangle size={17} /><span><strong>{isDemo ? "Sample data only." : "Evidence-first review."}</strong> {notice}</span><button aria-label="Dismiss notice" onClick={() => setNotice("")}><X size={15}/></button></div>

          <section className="data-panel upload-panel">

            <div className="panel-toolbar">

              <div className="panel-title"><Upload size={16}/> ANALYZE A DOCUMENT</div>

              <span className="muted">PDF / TXT · Max 10 MB</span>

            </div>

            <div className="upload-controls">

              <label className="file-picker">

                <FileText size={18}/>

                <span>{file ? file.name : "Choose a synthetic or authorized PDF/TXT file"}</span>

                <input

                  type="file"

                  accept=".pdf,.txt,application/pdf,text/plain"

                  onChange={(event) => { setFile(event.target.files?.[0] ?? null); setError(""); }}

                />

              </label>

              <button className="primary-button" onClick={analyzeDocument} disabled={busy || !file}>

                {busy ? <LoaderCircle size={16} className="spin-icon"/> : <Upload size={16}/>}

                {busy ? "Analyzing..." : "Upload & analyze"}

              </button>

              {!isDemo && <button className="secondary-button" onClick={resetDemo}>Show demo graph</button>}

            </div>

            {error && <div className="error-message"><AlertTriangle size={16}/><span>{error}</span></div>}

            {analysisMeta && <div className="analysis-meta">

              <span><strong>File:</strong> {analysisMeta.filename}</span>

              <span><strong>Model:</strong> {analysisMeta.model}</span>

              <span><strong>Characters analyzed:</strong> {analysisMeta.characterCount.toLocaleString()}</span>

            </div>}

          </section>

          <div className="metrics-grid">

            <Metric icon={<FolderOpen />} label="Active investigations" value={isDemo ? "04" : "01"} note={isDemo ? "Demo records" : "Current session"} />

            <Metric icon={<Fingerprint />} label="Extracted entities" value={String(entities.length)} note={isDemo ? "Illustrative count differs" : "From API response"} />

            <Metric icon={<GitBranch />} label="Candidate links" value={String(relationships.length)} note="Require verification" />

            <Metric icon={<FileText />} label="Indexed documents" value={isDemo ? "24" : "1"} note={isDemo ? "Sample documents" : "Current session only"} />

          </div>

          <div className="section-heading">

            <div><h2>Relationship explorer</h2><p>{isDemo ? "Sample graph — upload a document or load the saved graph from Neo4j." : "Graph from the latest analysis or the combined graph saved in Neo4j."}</p></div>

            <div className="graph-actions">

              <label className="search-box"><Search size={16}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search entities..." /></label>

              <button className="secondary-button" onClick={loadCombinedGraph} disabled={graphBusy}>
                {graphBusy ? <LoaderCircle size={16} className="spin-icon"/> : <Database size={16}/>}
                {graphBusy ? "Loading graph..." : "Load combined graph"}
              </button>
              <button className="secondary-button" onClick={() => setFilter(filter === "ALL" ? "PERSON" : filter === "PERSON" ? "ORGANIZATION" : "ALL")}><Filter size={16}/>{filter === "ALL" ? "All types" : filter === "PERSON" ? "People" : "Organizations"}</button>

            </div>

          </div>

          <div className={`explorer-layout ${showEvidence ? "" : "evidence-hidden"}`}>

            <section className="graph-panel">

              <div className="panel-toolbar"><div className="panel-title"><span className="green-dot" /> NETWORK MAP <span className="muted">· {nodes.length} entities</span></div><button className="icon-button" onClick={() => setShowEvidence(!showEvidence)} title="Toggle evidence panel"><FileSearch size={17}/></button></div>

              <div className="graph-canvas">

                {visibleEntities.length === 0 ? (

                  <div className="empty-state">No entities match your search or type filter.</div>

                ) : (

                  <ReactFlow

                    nodes={nodes}

                    edges={edges}

                    onNodeClick={(_, node) => setSelected(node.id)}

                    fitView

                    fitViewOptions={{ padding: 0.18 }}

                    minZoom={0.2}

                    maxZoom={1.7}

                  >

                    <Background color="#243247" gap={22} size={1} />

                    <MiniMap nodeColor="#3b8278" maskColor="#08111dcc" />

                    <Controls />

                  </ReactFlow>

                )}

              </div>

              <div className="graph-legend"><span><i className="legend-person"/> Person</span><span><i className="legend-org"/> Organization</span><span><i className="legend-other"/> Other entity</span><span className="legend-hint">Select a node to inspect</span></div>

            </section>

            {showEvidence && <aside className="evidence-panel">

              <div className="panel-toolbar"><div className="panel-title"><FileSearch size={16}/> ENTITY DETAILS</div><button className="icon-button" onClick={() => setShowEvidence(false)}><X size={16}/></button></div>

              {selectedEntity ? <>

                <div className="entity-profile"><div className="entity-profile-icon"><Users size={23}/></div><div><div className="entity-kind">{selectedEntity.kind}</div><h3>{selectedEntity.label}</h3><span className="review-status">{isDemo ? "Sample record" : "AI-extracted · review required"}</span></div></div>

                <div className="detail-section"><label>DESCRIPTION</label><p>{selectedEntity.detail}</p></div>

                <div className="detail-section"><label>ENTITY IDENTIFIER</label><div className="mono-value">{selectedEntity.id}</div></div>

                <div className="detail-section"><label>ENTITY EVIDENCE</label><p>{selectedEntity.evidence}</p><small>{selectedEntity.source}</small></div>

                <div className="detail-section"><label>CONNECTED ENTITIES</label>

                  {connectedRelationships.length === 0 ? <p>No relationship edges returned for this entity.</p> : connectedRelationships.map((relationship) => {

                    const id = relationship.source === selectedEntity.id ? relationship.target : relationship.source;

                    const entity = entities.find((item) => item.id === id);

                    if (!entity) return null;

                    return <button key={relationship.id} className="connection-row" onClick={() => setSelected(id)}><span className="connection-dot"/><span>{entity.label}<small>{relationship.label}</small></span><ChevronRight size={15}/></button>;

                  })}

                </div>

                {connectedRelationships.map((relationship) => <div className="detail-section" key={`evidence-${relationship.id}`}><label>LINK EVIDENCE · {relationship.status.toUpperCase()}</label><p>{relationship.evidence}</p></div>)}

                <div className="evidence-callout"><AlertTriangle size={17}/><span>Connections are candidate leads, not proof of wrongdoing. Verify quotes against the original source.</span></div>

              </> : <p>Select an entity to inspect details.</p>}

            </aside>}

          </div>

          <div className="bottom-grid">

            <section className="data-panel"><div className="panel-toolbar"><div className="panel-title"><Clock3 size={16}/> RECENT ACTIVITY</div><span className="muted">{isDemo ? "Demo feed" : "Current session"}</span></div>

              <div className="activity-row"><span className="activity-icon"><Upload size={16}/></span><div><strong>{isDemo ? "Sample case files prepared" : "Document analyzed"}</strong><small>{analysisMeta?.filename ?? "Synthetic dataset · For UI testing only"}</small></div><span className="activity-time">{isDemo ? "Demo" : "Latest"}</span></div>

              <div className="activity-row"><span className="activity-icon"><GitBranch size={16}/></span><div><strong>{isDemo ? "Illustrative relationship graph loaded" : "Analysis graph loaded"}</strong><small>{isDemo ? "Local frontend state · Not AI-generated" : "Graph may be loaded from Neo4j or current analysis"}</small></div><span className="activity-time">Now</span></div>

            </section>

            <section className="data-panel"><div className="panel-toolbar"><div className="panel-title"><ShieldCheck size={16}/> EVIDENCE STANDARDS</div></div>

              <div className="standard-row"><ShieldCheck size={17}/><div><strong>Source traceability</strong><small>Every real relationship must point to a source passage.</small></div></div>

              <div className="standard-row"><AlertTriangle size={17}/><div><strong>No guilt inference</strong><small>A connection is a lead, not proof of wrongdoing.</small></div></div>

            </section>

          </div>

          <footer>TRACE <span>·</span> Prototype v0.2 <span>·</span> Local demo workspace</footer>

        </section>

      </main>

    </div>

  );

}

function Metric({ icon, label, value, note }: { icon: ReactNode; label: string; value: string; note: string }) {

  return <div className="metric-card"><div className="metric-top"><span className="metric-icon">{icon}</span><span className="metric-note">{note}</span></div><strong className="metric-value">{value}</strong><span className="metric-label">{label}</span></div>;

}

export default App;
