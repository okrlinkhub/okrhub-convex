import "./App.css";
import { useMutation, useQuery, useAction } from "convex/react";
import { api } from "../convex/_generated/api";
import { useState } from "react";

// ============================================================================
// TYPES
// ============================================================================

type Team = {
  id: string;
  externalId?: string;
  name: string;
  slug: string;
  type: string;
};

type TabId = 
  | "setup"
  | "objectives"
  | "keyResults"
  | "risks"
  | "initiatives"
  | "indicators"
  | "indicatorValues"
  | "indicatorForecasts"
  | "milestones"
  | "sync";

// ============================================================================
// SHARED COMPONENTS
// ============================================================================

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    pending: "#ff9800",
    synced: "#4caf50",
    failed: "#f44336",
    processing: "#2196f3",
    success: "#4caf50",
  };

  return (
    <span
      style={{
        padding: "0.25rem 0.5rem",
        fontSize: "0.7rem",
        backgroundColor: colors[status] ?? "#9e9e9e",
        color: "white",
        borderRadius: "4px",
        textTransform: "uppercase",
      }}
    >
      {status}
    </span>
  );
}

function ResultMessage({ success, message }: { success: boolean; message: string }) {
  return (
    <div
      style={{
        marginTop: "1rem",
        padding: "0.75rem",
        backgroundColor: success ? "rgba(76, 175, 80, 0.1)" : "rgba(244, 67, 54, 0.1)",
        borderRadius: "4px",
        fontSize: "0.85rem",
        wordBreak: "break-all",
      }}
    >
      {message}
    </div>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: "0.75rem" }}>
      <label style={{ display: "block", fontSize: "0.85rem", marginBottom: "0.25rem", color: "#666" }}>
        {label}
      </label>
      {children}
    </div>
  );
}

// ============================================================================
// TAB NAVIGATION
// ============================================================================

function TabNav({ activeTab, setActiveTab }: { activeTab: TabId; setActiveTab: (tab: TabId) => void }) {
  const tabs: { id: TabId; label: string }[] = [
    { id: "setup", label: "Setup" },
    { id: "objectives", label: "Objectives" },
    { id: "keyResults", label: "Key Results" },
    { id: "risks", label: "Risks" },
    { id: "initiatives", label: "Initiatives" },
    { id: "indicators", label: "Indicators" },
    { id: "indicatorValues", label: "Values" },
    { id: "indicatorForecasts", label: "Forecasts" },
    { id: "milestones", label: "Milestones" },
    { id: "sync", label: "Sync Queue" },
  ];

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.25rem", marginBottom: "1.5rem" }}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => setActiveTab(tab.id)}
          style={{
            padding: "0.5rem 1rem",
            backgroundColor: activeTab === tab.id ? "#646cff" : "transparent",
            color: activeTab === tab.id ? "white" : "#646cff",
            border: "1px solid #646cff",
            borderRadius: "4px",
            cursor: "pointer",
            fontSize: "0.85rem",
          }}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

// ============================================================================
// SETUP SECTION
// ============================================================================

function SetupSection({
  email,
  setEmail,
  teams,
  setTeams,
  selectedTeam,
  setSelectedTeam,
  companyExternalId,
  setCompanyExternalId,
  userExternalId,
  setUserExternalId,
}: {
  email: string;
  setEmail: (email: string) => void;
  teams: Team[];
  setTeams: (teams: Team[]) => void;
  selectedTeam: Team | null;
  setSelectedTeam: (team: Team | null) => void;
  companyExternalId: string;
  setCompanyExternalId: (id: string) => void;
  userExternalId: string;
  setUserExternalId: (id: string) => void;
}) {
  const getMyTeams = useAction(api.example.testGetMyTeams);
  const saveTeam = useMutation(api.example.saveTeam);
  const localTeams = useQuery(api.example.listTeams);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveResult, setSaveResult] = useState<string | null>(null);

  const handleGetTeams = async () => {
    if (!email.trim()) return;
    setIsLoading(true);
    setError(null);

    try {
      const result = await getMyTeams({ email: email.trim() });
      if (result.success) {
        setTeams(result.teams);
        if (result.teams.length > 0 && result.teams[0]) {
          setSelectedTeam(result.teams[0]);
        }
      } else {
        setError(result.message ?? "Failed to get teams");
      }
    } catch (err) {
      const errorMessage = err && typeof err === "object" && "message" in err
        ? (err as { message: string }).message
        : "Unknown error";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveTeam = async () => {
    if (!selectedTeam) return;
    setIsSaving(true);
    setSaveResult(null);

    try {
      // Generate external ID for the team
      const externalId = selectedTeam.externalId ?? `example-app:team:${crypto.randomUUID()}`;
      
      await saveTeam({
        name: selectedTeam.name,
        linkHubTeamId: selectedTeam.id,
        externalId,
        type: selectedTeam.type,
        slug: selectedTeam.slug,
      });
      
      setSaveResult(`Team "${selectedTeam.name}" saved locally with externalId: ${externalId}`);
    } catch (err) {
      const errorMessage = err && typeof err === "object" && "message" in err
        ? (err as { message: string }).message
        : "Unknown error";
      setSaveResult(`Error: ${errorMessage}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSelectLocalTeam = (localTeam: { _id: string; name: string; linkHubTeamId: string; externalId: string; type?: string; slug?: string }) => {
    setSelectedTeam({
      id: localTeam.linkHubTeamId,
      externalId: localTeam.externalId,
      name: localTeam.name,
      slug: localTeam.slug ?? "",
      type: localTeam.type ?? "",
    });
  };

  return (
    <div style={{ padding: "1rem", border: "1px solid rgba(128, 128, 128, 0.3)", borderRadius: "8px" }}>
      <h2 style={{ marginTop: 0 }}>Setup Configuration</h2>
      
      {/* Local Teams Section */}
      {localTeams && localTeams.length > 0 && (
        <div style={{ marginBottom: "1.5rem", padding: "1rem", backgroundColor: "rgba(76, 175, 80, 0.1)", borderRadius: "4px" }}>
          <h3 style={{ marginTop: 0 }}>Saved Local Teams</h3>
          <FormField label="Select from saved teams">
            <select
              value={selectedTeam?.externalId ?? ""}
              onChange={(e) => {
                const team = localTeams.find((t) => t.externalId === e.target.value);
                if (team) handleSelectLocalTeam(team);
              }}
              style={{ width: "100%", padding: "0.5rem" }}
            >
              <option value="">-- Select saved team --</option>
              {localTeams.map((team) => (
                <option key={team._id} value={team.externalId}>
                  {team.name} ({team.type ?? "N/A"})
                </option>
              ))}
            </select>
          </FormField>
        </div>
      )}
      
      <div style={{ marginBottom: "1.5rem" }}>
        <h3>1. Get Teams from LinkHub</h3>
        <FormField label="User Email">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="user@example.com"
            style={{ width: "100%", padding: "0.5rem" }}
          />
        </FormField>
        <button onClick={handleGetTeams} disabled={isLoading || !email.trim()}>
          {isLoading ? "Loading..." : "Get My Teams"}
        </button>
        {error && <ResultMessage success={false} message={error} />}
      </div>

      {teams.length > 0 && (
        <div style={{ marginBottom: "1.5rem" }}>
          <h3>2. Select Team from LinkHub</h3>
          <FormField label="Team">
            <select
              value={selectedTeam?.id ?? ""}
              onChange={(e) => {
                const team = teams.find((t) => t.id === e.target.value);
                setSelectedTeam(team ?? null);
              }}
              style={{ width: "100%", padding: "0.5rem" }}
            >
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name} ({team.type}) - {team.externalId ?? team.id}
                </option>
              ))}
            </select>
          </FormField>
          {selectedTeam && (
            <>
              {selectedTeam.externalId ? (
                <div style={{ fontSize: "0.85rem", color: "#4caf50", marginBottom: "0.5rem" }}>
                  <strong>✓ Team External ID:</strong>{" "}
                  <code>{selectedTeam.externalId}</code>
                </div>
              ) : (
                <div style={{ fontSize: "0.85rem", color: "#ff9800", marginBottom: "0.5rem", padding: "0.5rem", backgroundColor: "rgba(255, 152, 0, 0.1)", borderRadius: "4px" }}>
                  <strong>⚠ Team not saved locally.</strong> You must save the team before creating entities.
                </div>
              )}
              <button onClick={handleSaveTeam} disabled={isSaving || !!selectedTeam.externalId} style={{ marginTop: "0.5rem" }}>
                {isSaving ? "Saving..." : selectedTeam.externalId ? "Already Saved" : "Save Team Locally"}
              </button>
              {saveResult && (
                <div style={{ marginTop: "0.5rem", fontSize: "0.85rem", color: saveResult.startsWith("Error") ? "#f44336" : "#4caf50" }}>
                  {saveResult}
                </div>
              )}
            </>
          )}
        </div>
      )}

      <div style={{ marginBottom: "1.5rem" }}>
        <h3>3. External IDs (for testing)</h3>
        <FormField label="Company External ID">
          <input
            type="text"
            value={companyExternalId}
            onChange={(e) => setCompanyExternalId(e.target.value)}
            placeholder="example-app:company:uuid"
            style={{ width: "100%", padding: "0.5rem" }}
          />
        </FormField>
        <FormField label="User External ID (for assignee/createdBy)">
          <input
            type="text"
            value={userExternalId}
            onChange={(e) => setUserExternalId(e.target.value)}
            placeholder="example-app:user:uuid"
            style={{ width: "100%", padding: "0.5rem" }}
          />
        </FormField>
      </div>

      <div style={{ padding: "1rem", backgroundColor: "rgba(100, 108, 255, 0.1)", borderRadius: "4px" }}>
        <h4 style={{ margin: 0 }}>Current Configuration</h4>
        <ul style={{ textAlign: "left", fontSize: "0.85rem", marginBottom: 0 }}>
          <li>Team: {selectedTeam?.name ?? "Not selected"}</li>
          <li>
            Team External ID:{" "}
            {selectedTeam?.externalId ? (
              <code style={{ color: "#4caf50" }}>{selectedTeam.externalId}</code>
            ) : (
              <span style={{ color: "#ff9800" }}>Not saved - save team first!</span>
            )}
          </li>
          <li>Company External ID: {companyExternalId || "Not set"}</li>
          <li>User External ID: {userExternalId || "Not set"}</li>
          <li>Saved Local Teams: {localTeams?.length ?? 0}</li>
        </ul>
      </div>
    </div>
  );
}

// ============================================================================
// OBJECTIVES SECTION
// ============================================================================

function ObjectivesSection({ teamExternalId }: { teamExternalId: string }) {
  const objectives = useQuery(api.example.listAllObjectives);
  const createObjective = useMutation(api.example.createObjective);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim() || !teamExternalId) return;

    setIsLoading(true);
    setResult(null);

    try {
      const res = await createObjective({
        sourceApp: "example-app",
        sourceUrl: "https://example-app.local/objectives",
        title,
        description,
        teamExternalId,
      });
      if (res.success) {
        setResult({ success: true, message: `Created objective: ${res.externalId}` });
        setTitle("");
        setDescription("");
      } else {
        setResult({ success: false, message: res.error ?? "Failed to create" });
      }
    } catch (err) {
      const errorMessage = err && typeof err === "object" && "message" in err
        ? (err as { message: string }).message
        : "Unknown error";
      setResult({ success: false, message: errorMessage });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ padding: "1rem", border: "1px solid rgba(128, 128, 128, 0.3)", borderRadius: "8px" }}>
      <h2 style={{ marginTop: 0 }}>Objectives</h2>
      
      <form onSubmit={handleCreate} style={{ marginBottom: "1.5rem" }}>
        <FormField label="Title">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Objective title"
            style={{ width: "100%", padding: "0.5rem" }}
          />
        </FormField>
        <FormField label="Description">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Objective description"
            style={{ width: "100%", padding: "0.5rem", minHeight: "60px" }}
          />
        </FormField>
        <button type="submit" disabled={isLoading || !teamExternalId}>
          {isLoading ? "Creating..." : "Create Objective"}
        </button>
        {!teamExternalId && <span style={{ marginLeft: "0.5rem", color: "#f44336", fontSize: "0.85rem" }}>Save a team locally first (in Setup tab)</span>}
      </form>

      {result && <ResultMessage success={result.success} message={result.message} />}

      <h3>Local Objectives ({objectives?.length ?? 0})</h3>
      <div style={{ maxHeight: "300px", overflowY: "auto" }}>
        {objectives?.map((obj) => (
          <div key={obj._id} style={{ padding: "0.75rem", marginBottom: "0.5rem", backgroundColor: "rgba(128, 128, 128, 0.1)", borderRadius: "4px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <strong>{obj.title}</strong>
              <StatusBadge status={obj.syncStatus} />
            </div>
            <div style={{ fontSize: "0.8rem", color: "#666", marginTop: "0.25rem" }}>{obj.description}</div>
            <code style={{ fontSize: "0.75rem" }}>{obj.externalId}</code>
          </div>
        ))}
        {objectives?.length === 0 && <div style={{ color: "#666", fontStyle: "italic" }}>No objectives yet</div>}
      </div>
    </div>
  );
}

// ============================================================================
// KEY RESULTS SECTION
// ============================================================================

function KeyResultsSection({ teamExternalId, indicatorExternalId }: { teamExternalId: string; indicatorExternalId: string }) {
  const keyResults = useQuery(api.example.listAllKeyResults);
  const objectives = useQuery(api.example.listAllObjectives);
  const indicators = useQuery(api.example.listAllIndicators);
  const createKeyResult = useMutation(api.example.createKeyResult);
  const [objectiveExternalId, setObjectiveExternalId] = useState("");
  const [selectedIndicator, setSelectedIndicator] = useState(indicatorExternalId);
  const [forecastValue, setForecastValue] = useState("");
  const [targetValue, setTargetValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  // Use selected indicator or fallback to prop
  const effectiveIndicatorId = selectedIndicator || indicatorExternalId;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamExternalId || !effectiveIndicatorId) return;

    setIsLoading(true);
    setResult(null);

    try {
      const res = await createKeyResult({
        sourceApp: "example-app",
        sourceUrl: "https://example-app.local/key-results",
        teamExternalId,
        indicatorExternalId: effectiveIndicatorId,
        objectiveExternalId: objectiveExternalId || undefined,
        forecastValue: forecastValue ? parseFloat(forecastValue) : undefined,
        targetValue: targetValue ? parseFloat(targetValue) : undefined,
      });
      if (res.success) {
        setResult({ success: true, message: `Created key result: ${res.externalId}` });
        setObjectiveExternalId("");
        setForecastValue("");
        setTargetValue("");
      } else {
        setResult({ success: false, message: res.error ?? "Failed to create" });
      }
    } catch (err) {
      const errorMessage = err && typeof err === "object" && "message" in err
        ? (err as { message: string }).message
        : "Unknown error";
      setResult({ success: false, message: errorMessage });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ padding: "1rem", border: "1px solid rgba(128, 128, 128, 0.3)", borderRadius: "8px" }}>
      <h2 style={{ marginTop: 0 }}>Key Results</h2>
      
      <form onSubmit={handleCreate} style={{ marginBottom: "1.5rem" }}>
        <FormField label="Objective (optional)">
          <select
            value={objectiveExternalId}
            onChange={(e) => setObjectiveExternalId(e.target.value)}
            style={{ width: "100%", padding: "0.5rem" }}
          >
            <option value="">-- No Objective --</option>
            {objectives?.map((obj) => (
              <option key={obj._id} value={obj.externalId}>{obj.title}</option>
            ))}
          </select>
        </FormField>
        <FormField label="Indicator">
          <select
            value={selectedIndicator}
            onChange={(e) => setSelectedIndicator(e.target.value)}
            style={{ width: "100%", padding: "0.5rem" }}
          >
            <option value="">-- Select Indicator --</option>
            {indicators?.map((ind) => (
              <option key={ind._id} value={ind.externalId}>{ind.description}</option>
            ))}
          </select>
        </FormField>
        <FormField label="Forecast Value">
          <input
            type="number"
            value={forecastValue}
            onChange={(e) => setForecastValue(e.target.value)}
            placeholder="0"
            style={{ width: "100%", padding: "0.5rem" }}
          />
        </FormField>
        <FormField label="Target Value">
          <input
            type="number"
            value={targetValue}
            onChange={(e) => setTargetValue(e.target.value)}
            placeholder="100"
            style={{ width: "100%", padding: "0.5rem" }}
          />
        </FormField>
        <button type="submit" disabled={isLoading || !teamExternalId || !effectiveIndicatorId}>
          {isLoading ? "Creating..." : "Create Key Result"}
        </button>
        {(!teamExternalId || !effectiveIndicatorId) && (
          <span style={{ marginLeft: "0.5rem", color: "#f44336", fontSize: "0.85rem" }}>
            Need team and indicator
          </span>
        )}
      </form>

      {result && <ResultMessage success={result.success} message={result.message} />}

      <h3>Local Key Results ({keyResults?.length ?? 0})</h3>
      <div style={{ maxHeight: "300px", overflowY: "auto" }}>
        {keyResults?.map((kr) => (
          <div key={kr._id} style={{ padding: "0.75rem", marginBottom: "0.5rem", backgroundColor: "rgba(128, 128, 128, 0.1)", borderRadius: "4px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <strong>KR: {kr.targetValue ?? "?"}</strong>
              <StatusBadge status={kr.syncStatus} />
            </div>
            <code style={{ fontSize: "0.75rem" }}>{kr.externalId}</code>
          </div>
        ))}
        {keyResults?.length === 0 && <div style={{ color: "#666", fontStyle: "italic" }}>No key results yet</div>}
      </div>
    </div>
  );
}

// ============================================================================
// RISKS SECTION
// ============================================================================

function RisksSection({ teamExternalId }: { teamExternalId: string }) {
  const risks = useQuery(api.example.listAllRisks);
  const keyResults = useQuery(api.example.listAllKeyResults);
  const createRisk = useMutation(api.example.createRisk);
  const [description, setDescription] = useState("");
  const [keyResultExternalId, setKeyResultExternalId] = useState("");
  const [priority, setPriority] = useState<"lowest" | "low" | "medium" | "high" | "highest">("medium");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() || !teamExternalId) return;

    setIsLoading(true);
    setResult(null);

    try {
      const res = await createRisk({
        sourceApp: "example-app",
        sourceUrl: "https://example-app.local/risks",
        description,
        teamExternalId,
        keyResultExternalId: keyResultExternalId || undefined,
        priority,
      });
      if (res.success) {
        setResult({ success: true, message: `Created risk: ${res.externalId}` });
        setDescription("");
        setKeyResultExternalId("");
      } else {
        setResult({ success: false, message: res.error ?? "Failed to create" });
      }
    } catch (err) {
      const errorMessage = err && typeof err === "object" && "message" in err
        ? (err as { message: string }).message
        : "Unknown error";
      setResult({ success: false, message: errorMessage });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ padding: "1rem", border: "1px solid rgba(128, 128, 128, 0.3)", borderRadius: "8px" }}>
      <h2 style={{ marginTop: 0 }}>Risks</h2>
      
      <form onSubmit={handleCreate} style={{ marginBottom: "1.5rem" }}>
        <FormField label="Description">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Risk description"
            style={{ width: "100%", padding: "0.5rem", minHeight: "60px" }}
          />
        </FormField>
        <FormField label="Key Result (optional)">
          <select
            value={keyResultExternalId}
            onChange={(e) => setKeyResultExternalId(e.target.value)}
            style={{ width: "100%", padding: "0.5rem" }}
          >
            <option value="">-- No Key Result --</option>
            {keyResults?.map((kr) => (
              <option key={kr._id} value={kr.externalId}>KR: {kr.targetValue ?? kr.externalId}</option>
            ))}
          </select>
        </FormField>
        <FormField label="Priority">
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value as typeof priority)}
            style={{ width: "100%", padding: "0.5rem" }}
          >
            <option value="lowest">Lowest</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="highest">Highest</option>
          </select>
        </FormField>
        <button type="submit" disabled={isLoading || !teamExternalId}>
          {isLoading ? "Creating..." : "Create Risk"}
        </button>
      </form>

      {result && <ResultMessage success={result.success} message={result.message} />}

      <h3>Local Risks ({risks?.length ?? 0})</h3>
      <div style={{ maxHeight: "300px", overflowY: "auto" }}>
        {risks?.map((risk) => (
          <div key={risk._id} style={{ padding: "0.75rem", marginBottom: "0.5rem", backgroundColor: "rgba(128, 128, 128, 0.1)", borderRadius: "4px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <strong>{risk.priority.toUpperCase()}</strong>
              <StatusBadge status={risk.syncStatus} />
            </div>
            <div style={{ fontSize: "0.8rem", color: "#666", marginTop: "0.25rem" }}>{risk.description}</div>
            <code style={{ fontSize: "0.75rem" }}>{risk.externalId}</code>
          </div>
        ))}
        {risks?.length === 0 && <div style={{ color: "#666", fontStyle: "italic" }}>No risks yet</div>}
      </div>
    </div>
  );
}

// ============================================================================
// INITIATIVES SECTION
// ============================================================================

function InitiativesSection({ teamExternalId, userExternalId }: { teamExternalId: string; userExternalId: string }) {
  const initiatives = useQuery(api.example.listAllInitiatives);
  const risks = useQuery(api.example.listAllRisks);
  const createInitiative = useMutation(api.example.createInitiative);
  const [description, setDescription] = useState("");
  const [riskExternalId, setRiskExternalId] = useState("");
  const [priority, setPriority] = useState<"lowest" | "low" | "medium" | "high" | "highest">("medium");
  const [status, setStatus] = useState<"ON_TIME" | "OVERDUE" | "FINISHED">("ON_TIME");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() || !teamExternalId || !userExternalId) return;

    setIsLoading(true);
    setResult(null);

    try {
      const res = await createInitiative({
        sourceApp: "example-app",
        sourceUrl: "https://example-app.local/initiatives",
        description,
        teamExternalId,
        assigneeExternalId: userExternalId,
        createdByExternalId: userExternalId,
        riskExternalId: riskExternalId || undefined,
        priority,
        status,
      });
      if (res.success) {
        setResult({ success: true, message: `Created initiative: ${res.externalId}` });
        setDescription("");
        setRiskExternalId("");
      } else {
        setResult({ success: false, message: res.error ?? "Failed to create" });
      }
    } catch (err) {
      const errorMessage = err && typeof err === "object" && "message" in err
        ? (err as { message: string }).message
        : "Unknown error";
      setResult({ success: false, message: errorMessage });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ padding: "1rem", border: "1px solid rgba(128, 128, 128, 0.3)", borderRadius: "8px" }}>
      <h2 style={{ marginTop: 0 }}>Initiatives</h2>
      
      <form onSubmit={handleCreate} style={{ marginBottom: "1.5rem" }}>
        <FormField label="Description">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Initiative description"
            style={{ width: "100%", padding: "0.5rem", minHeight: "60px" }}
          />
        </FormField>
        <FormField label="Risk (optional)">
          <select
            value={riskExternalId}
            onChange={(e) => setRiskExternalId(e.target.value)}
            style={{ width: "100%", padding: "0.5rem" }}
          >
            <option value="">-- No Risk --</option>
            {risks?.map((risk) => (
              <option key={risk._id} value={risk.externalId}>{risk.description.substring(0, 50)}</option>
            ))}
          </select>
        </FormField>
        <FormField label="Priority">
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value as typeof priority)}
            style={{ width: "100%", padding: "0.5rem" }}
          >
            <option value="lowest">Lowest</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="highest">Highest</option>
          </select>
        </FormField>
        <FormField label="Status">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as typeof status)}
            style={{ width: "100%", padding: "0.5rem" }}
          >
            <option value="ON_TIME">On Time</option>
            <option value="OVERDUE">Overdue</option>
            <option value="FINISHED">Finished</option>
          </select>
        </FormField>
        <button type="submit" disabled={isLoading || !teamExternalId || !userExternalId}>
          {isLoading ? "Creating..." : "Create Initiative"}
        </button>
        {!userExternalId && <span style={{ marginLeft: "0.5rem", color: "#f44336", fontSize: "0.85rem" }}>Set user external ID in Setup</span>}
      </form>

      {result && <ResultMessage success={result.success} message={result.message} />}

      <h3>Local Initiatives ({initiatives?.length ?? 0})</h3>
      <div style={{ maxHeight: "300px", overflowY: "auto" }}>
        {initiatives?.map((init) => (
          <div key={init._id} style={{ padding: "0.75rem", marginBottom: "0.5rem", backgroundColor: "rgba(128, 128, 128, 0.1)", borderRadius: "4px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <strong>{init.status}</strong>
              <StatusBadge status={init.syncStatus} />
            </div>
            <div style={{ fontSize: "0.8rem", color: "#666", marginTop: "0.25rem" }}>{init.description}</div>
            <code style={{ fontSize: "0.75rem" }}>{init.externalId}</code>
          </div>
        ))}
        {initiatives?.length === 0 && <div style={{ color: "#666", fontStyle: "italic" }}>No initiatives yet</div>}
      </div>
    </div>
  );
}

// ============================================================================
// INDICATORS SECTION
// ============================================================================

function IndicatorsSection({ companyExternalId, onIndicatorCreated }: { companyExternalId: string; onIndicatorCreated: (id: string) => void }) {
  const indicators = useQuery(api.example.listAllIndicators);
  const createIndicator = useMutation(api.example.createIndicator);
  const [description, setDescription] = useState("");
  const [symbol, setSymbol] = useState("");
  const [periodicity, setPeriodicity] = useState<"weekly" | "monthly" | "quarterly" | "semesterly" | "yearly">("monthly");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() || !symbol.trim() || !companyExternalId) return;

    setIsLoading(true);
    setResult(null);

    try {
      const res = await createIndicator({
        sourceApp: "example-app",
        sourceUrl: "https://example-app.local/indicators",
        companyExternalId,
        description,
        symbol,
        periodicity,
      });
      if (res.success) {
        setResult({ success: true, message: `Created indicator: ${res.externalId}` });
        onIndicatorCreated(res.externalId);
        setDescription("");
        setSymbol("");
      } else {
        setResult({ success: false, message: res.error ?? "Failed to create" });
      }
    } catch (err) {
      const errorMessage = err && typeof err === "object" && "message" in err
        ? (err as { message: string }).message
        : "Unknown error";
      setResult({ success: false, message: errorMessage });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ padding: "1rem", border: "1px solid rgba(128, 128, 128, 0.3)", borderRadius: "8px" }}>
      <h2 style={{ marginTop: 0 }}>Indicators</h2>
      
      <form onSubmit={handleCreate} style={{ marginBottom: "1.5rem" }}>
        <FormField label="Description">
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Indicator description"
            style={{ width: "100%", padding: "0.5rem" }}
          />
        </FormField>
        <FormField label="Symbol">
          <input
            type="text"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            placeholder="e.g., %, $, units"
            style={{ width: "100%", padding: "0.5rem" }}
          />
        </FormField>
        <FormField label="Periodicity">
          <select
            value={periodicity}
            onChange={(e) => setPeriodicity(e.target.value as typeof periodicity)}
            style={{ width: "100%", padding: "0.5rem" }}
          >
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="quarterly">Quarterly</option>
            <option value="semesterly">Semesterly</option>
            <option value="yearly">Yearly</option>
          </select>
        </FormField>
        <button type="submit" disabled={isLoading || !companyExternalId}>
          {isLoading ? "Creating..." : "Create Indicator"}
        </button>
        {!companyExternalId && <span style={{ marginLeft: "0.5rem", color: "#f44336", fontSize: "0.85rem" }}>Set company external ID in Setup</span>}
      </form>

      {result && <ResultMessage success={result.success} message={result.message} />}

      <h3>Local Indicators ({indicators?.length ?? 0})</h3>
      <div style={{ maxHeight: "300px", overflowY: "auto" }}>
        {indicators?.map((ind) => (
          <div key={ind._id} style={{ padding: "0.75rem", marginBottom: "0.5rem", backgroundColor: "rgba(128, 128, 128, 0.1)", borderRadius: "4px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <strong>{ind.description}</strong>
              <StatusBadge status={ind.syncStatus} />
            </div>
            <div style={{ fontSize: "0.8rem", color: "#666", marginTop: "0.25rem" }}>
              {ind.symbol} | {ind.periodicity}
            </div>
            <code style={{ fontSize: "0.75rem" }}>{ind.externalId}</code>
          </div>
        ))}
        {indicators?.length === 0 && <div style={{ color: "#666", fontStyle: "italic" }}>No indicators yet</div>}
      </div>
    </div>
  );
}

// ============================================================================
// INDICATOR VALUES SECTION
// ============================================================================

function IndicatorValuesSection({ indicatorExternalId }: { indicatorExternalId: string }) {
  const values = useQuery(api.example.listAllIndicatorValues);
  const indicators = useQuery(api.example.listAllIndicators);
  const createValue = useMutation(api.example.createIndicatorValue);
  const [selectedIndicator, setSelectedIndicator] = useState(indicatorExternalId);
  const [value, setValue] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const indId = selectedIndicator || indicatorExternalId;
    if (!value || !indId) return;

    setIsLoading(true);
    setResult(null);

    try {
      const res = await createValue({
        sourceApp: "example-app",
        sourceUrl: "https://example-app.local/indicator-values",
        indicatorExternalId: indId,
        value: parseFloat(value),
        date: new Date(date ?? new Date()).getTime(),
      });
      if (res.success) {
        setResult({ success: true, message: `Created value: ${res.externalId}` });
        setValue("");
      } else {
        setResult({ success: false, message: res.error ?? "Failed to create" });
      }
    } catch (err) {
      const errorMessage = err && typeof err === "object" && "message" in err
        ? (err as { message: string }).message
        : "Unknown error";
      setResult({ success: false, message: errorMessage });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ padding: "1rem", border: "1px solid rgba(128, 128, 128, 0.3)", borderRadius: "8px" }}>
      <h2 style={{ marginTop: 0 }}>Indicator Values</h2>
      
      <form onSubmit={handleCreate} style={{ marginBottom: "1.5rem" }}>
        <FormField label="Indicator">
          <select
            value={selectedIndicator}
            onChange={(e) => setSelectedIndicator(e.target.value)}
            style={{ width: "100%", padding: "0.5rem" }}
          >
            <option value="">-- Select Indicator --</option>
            {indicators?.map((ind) => (
              <option key={ind._id} value={ind.externalId}>{ind.description}</option>
            ))}
          </select>
        </FormField>
        <FormField label="Value">
          <input
            type="number"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="100"
            style={{ width: "100%", padding: "0.5rem" }}
          />
        </FormField>
        <FormField label="Date">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            style={{ width: "100%", padding: "0.5rem" }}
          />
        </FormField>
        <button type="submit" disabled={isLoading || (!selectedIndicator && !indicatorExternalId)}>
          {isLoading ? "Creating..." : "Create Value"}
        </button>
      </form>

      {result && <ResultMessage success={result.success} message={result.message} />}

      <h3>Local Values ({values?.length ?? 0})</h3>
      <div style={{ maxHeight: "300px", overflowY: "auto" }}>
        {values?.map((val) => (
          <div key={val._id} style={{ padding: "0.75rem", marginBottom: "0.5rem", backgroundColor: "rgba(128, 128, 128, 0.1)", borderRadius: "4px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <strong>{val.value}</strong>
              <StatusBadge status={val.syncStatus} />
            </div>
            <div style={{ fontSize: "0.8rem", color: "#666" }}>{new Date(val.date).toLocaleDateString()}</div>
          </div>
        ))}
        {values?.length === 0 && <div style={{ color: "#666", fontStyle: "italic" }}>No values yet</div>}
      </div>
    </div>
  );
}

// ============================================================================
// INDICATOR FORECASTS SECTION
// ============================================================================

function IndicatorForecastsSection({ indicatorExternalId }: { indicatorExternalId: string }) {
  const forecasts = useQuery(api.example.listAllIndicatorForecasts);
  const indicators = useQuery(api.example.listAllIndicators);
  const createForecast = useMutation(api.example.createIndicatorForecast);
  const [selectedIndicator, setSelectedIndicator] = useState(indicatorExternalId);
  const [value, setValue] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const indId = selectedIndicator || indicatorExternalId;
    if (!value || !indId) return;

    setIsLoading(true);
    setResult(null);

    try {
      const res = await createForecast({
        sourceApp: "example-app",
        sourceUrl: "https://example-app.local/indicator-forecasts",
        indicatorExternalId: indId,
        value: parseFloat(value),
        date: new Date(date ?? new Date()).getTime(),
      });
      if (res.success) {
        setResult({ success: true, message: `Created forecast: ${res.externalId}` });
        setValue("");
      } else {
        setResult({ success: false, message: res.error ?? "Failed to create" });
      }
    } catch (err) {
      const errorMessage = err && typeof err === "object" && "message" in err
        ? (err as { message: string }).message
        : "Unknown error";
      setResult({ success: false, message: errorMessage });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ padding: "1rem", border: "1px solid rgba(128, 128, 128, 0.3)", borderRadius: "8px" }}>
      <h2 style={{ marginTop: 0 }}>Indicator Forecasts</h2>
      
      <form onSubmit={handleCreate} style={{ marginBottom: "1.5rem" }}>
        <FormField label="Indicator">
          <select
            value={selectedIndicator}
            onChange={(e) => setSelectedIndicator(e.target.value)}
            style={{ width: "100%", padding: "0.5rem" }}
          >
            <option value="">-- Select Indicator --</option>
            {indicators?.map((ind) => (
              <option key={ind._id} value={ind.externalId}>{ind.description}</option>
            ))}
          </select>
        </FormField>
        <FormField label="Forecast Value">
          <input
            type="number"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="100"
            style={{ width: "100%", padding: "0.5rem" }}
          />
        </FormField>
        <FormField label="Date">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            style={{ width: "100%", padding: "0.5rem" }}
          />
        </FormField>
        <button type="submit" disabled={isLoading || (!selectedIndicator && !indicatorExternalId)}>
          {isLoading ? "Creating..." : "Create Forecast"}
        </button>
      </form>

      {result && <ResultMessage success={result.success} message={result.message} />}

      <h3>Local Forecasts ({forecasts?.length ?? 0})</h3>
      <div style={{ maxHeight: "300px", overflowY: "auto" }}>
        {forecasts?.map((fc) => (
          <div key={fc._id} style={{ padding: "0.75rem", marginBottom: "0.5rem", backgroundColor: "rgba(128, 128, 128, 0.1)", borderRadius: "4px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <strong>{fc.value}</strong>
              <StatusBadge status={fc.syncStatus} />
            </div>
            <div style={{ fontSize: "0.8rem", color: "#666" }}>{new Date(fc.date).toLocaleDateString()}</div>
          </div>
        ))}
        {forecasts?.length === 0 && <div style={{ color: "#666", fontStyle: "italic" }}>No forecasts yet</div>}
      </div>
    </div>
  );
}

// ============================================================================
// MILESTONES SECTION
// ============================================================================

function MilestonesSection({ indicatorExternalId }: { indicatorExternalId: string }) {
  const milestones = useQuery(api.example.listAllMilestones);
  const indicators = useQuery(api.example.listAllIndicators);
  const createMilestone = useMutation(api.example.createMilestone);
  const [selectedIndicator, setSelectedIndicator] = useState(indicatorExternalId);
  const [description, setDescription] = useState("");
  const [value, setValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const indId = selectedIndicator || indicatorExternalId;
    if (!description.trim() || !value || !indId) return;

    setIsLoading(true);
    setResult(null);

    try {
      const res = await createMilestone({
        sourceApp: "example-app",
        sourceUrl: "https://example-app.local/milestones",
        indicatorExternalId: indId,
        description,
        value: parseFloat(value),
      });
      if (res.success) {
        setResult({ success: true, message: `Created milestone: ${res.externalId}` });
        setDescription("");
        setValue("");
      } else {
        setResult({ success: false, message: res.error ?? "Failed to create" });
      }
    } catch (err) {
      const errorMessage = err && typeof err === "object" && "message" in err
        ? (err as { message: string }).message
        : "Unknown error";
      setResult({ success: false, message: errorMessage });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ padding: "1rem", border: "1px solid rgba(128, 128, 128, 0.3)", borderRadius: "8px" }}>
      <h2 style={{ marginTop: 0 }}>Milestones</h2>
      
      <form onSubmit={handleCreate} style={{ marginBottom: "1.5rem" }}>
        <FormField label="Indicator">
          <select
            value={selectedIndicator}
            onChange={(e) => setSelectedIndicator(e.target.value)}
            style={{ width: "100%", padding: "0.5rem" }}
          >
            <option value="">-- Select Indicator --</option>
            {indicators?.map((ind) => (
              <option key={ind._id} value={ind.externalId}>{ind.description}</option>
            ))}
          </select>
        </FormField>
        <FormField label="Description">
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Milestone description"
            style={{ width: "100%", padding: "0.5rem" }}
          />
        </FormField>
        <FormField label="Target Value">
          <input
            type="number"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="100"
            style={{ width: "100%", padding: "0.5rem" }}
          />
        </FormField>
        <button type="submit" disabled={isLoading || (!selectedIndicator && !indicatorExternalId)}>
          {isLoading ? "Creating..." : "Create Milestone"}
        </button>
      </form>

      {result && <ResultMessage success={result.success} message={result.message} />}

      <h3>Local Milestones ({milestones?.length ?? 0})</h3>
      <div style={{ maxHeight: "300px", overflowY: "auto" }}>
        {milestones?.map((ms) => (
          <div key={ms._id} style={{ padding: "0.75rem", marginBottom: "0.5rem", backgroundColor: "rgba(128, 128, 128, 0.1)", borderRadius: "4px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <strong>{ms.description}</strong>
              <StatusBadge status={ms.syncStatus} />
            </div>
            <div style={{ fontSize: "0.8rem", color: "#666" }}>Target: {ms.value}</div>
            <code style={{ fontSize: "0.75rem" }}>{ms.externalId}</code>
          </div>
        ))}
        {milestones?.length === 0 && <div style={{ color: "#666", fontStyle: "italic" }}>No milestones yet</div>}
      </div>
    </div>
  );
}

// ============================================================================
// SYNC QUEUE SECTION
// ============================================================================

function SyncSection() {
  const pendingItems = useQuery(api.example.listPendingSync);
  const processSyncQueue = useAction(api.example.testProcessSyncQueue);
  const [isProcessing, setIsProcessing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ processed: number; succeeded: number; failed: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleProcessSync = async () => {
    setIsProcessing(true);
    setSyncResult(null);
    setError(null);

    try {
      const result = await processSyncQueue({ batchSize: 20 });
      setSyncResult(result);
    } catch (err) {
      const errorMessage = err && typeof err === "object" && "message" in err
        ? (err as { message: string }).message
        : "Unknown error";
      setError(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div style={{ padding: "1rem", border: "1px solid rgba(128, 128, 128, 0.3)", borderRadius: "8px" }}>
      <h2 style={{ marginTop: 0 }}>Sync Queue</h2>
      
      <div style={{ marginBottom: "1.5rem" }}>
        <button onClick={handleProcessSync} disabled={isProcessing} style={{ marginRight: "1rem" }}>
          {isProcessing ? "Processing..." : "Process Sync Queue"}
        </button>
        <span style={{ fontSize: "0.85rem", color: "#666" }}>
          {pendingItems?.length ?? 0} pending items
        </span>
      </div>

      {syncResult && (
        <div style={{ marginBottom: "1rem", padding: "1rem", backgroundColor: "rgba(76, 175, 80, 0.1)", borderRadius: "4px" }}>
          <strong>Sync Complete:</strong>
          <ul style={{ margin: "0.5rem 0", paddingLeft: "1.5rem" }}>
            <li>Processed: {syncResult.processed}</li>
            <li>Succeeded: {syncResult.succeeded}</li>
            <li>Failed: {syncResult.failed}</li>
          </ul>
        </div>
      )}

      {error && <ResultMessage success={false} message={error} />}

      <div style={{ marginTop: "1rem", padding: "1rem", backgroundColor: "rgba(100, 108, 255, 0.1)", borderRadius: "4px" }}>
        <h4 style={{ margin: 0, marginBottom: "0.5rem" }}>Read-Only in LinkHub</h4>
        <p style={{ fontSize: "0.85rem", margin: 0 }}>
          After syncing, entities in LinkHub will have a <code>sourceUrl</code> field and their core fields become read-only.
          Only specific fields (like weight, impact, status) can be modified in LinkHub.
        </p>
      </div>

      <h3 style={{ marginTop: "1.5rem" }}>Queue Items</h3>
      <div style={{ maxHeight: "400px", overflowY: "auto" }}>
        {pendingItems?.map((item) => (
          <div key={item._id} style={{ padding: "0.75rem", marginBottom: "0.5rem", backgroundColor: "rgba(128, 128, 128, 0.1)", borderRadius: "4px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.25rem" }}>
              <strong>{item.entityType}</strong>
              <StatusBadge status={item.status} />
            </div>
            <code style={{ fontSize: "0.75rem", display: "block" }}>{item.externalId}</code>
            {item.errorMessage && (
              <div style={{ fontSize: "0.8rem", color: "#f44336", marginTop: "0.25rem" }}>{item.errorMessage}</div>
            )}
            <div style={{ fontSize: "0.75rem", color: "#666", marginTop: "0.25rem" }}>
              Attempts: {item.attempts} | Created: {new Date(item.createdAt).toLocaleString()}
            </div>
          </div>
        ))}
        {pendingItems?.length === 0 && (
          <div style={{ color: "#666", fontStyle: "italic" }}>No items in sync queue</div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// MAIN APP
// ============================================================================

function App() {
  const [activeTab, setActiveTab] = useState<TabId>("setup");
  const [email, setEmail] = useState("");
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [companyExternalId, setCompanyExternalId] = useState("example-app:company:00000000-0000-0000-0000-000000000001");
  const [userExternalId, setUserExternalId] = useState("example-app:user:00000000-0000-0000-0000-000000000001");
  const [indicatorExternalId, setIndicatorExternalId] = useState("");

  // Team external ID is ONLY available from saved local teams
  // Users MUST save a team locally before creating entities
  const teamExternalId = selectedTeam?.externalId ?? "";

  return (
    <>
      <h1>OKRHub Component Demo</h1>
      <p style={{ color: "#666", marginBottom: "1.5rem" }}>
        Test all OKRHub component features: team selection, entity CRUD, and sync to LinkHub.
      </p>

      <TabNav activeTab={activeTab} setActiveTab={setActiveTab} />

      <div className="card">
        {activeTab === "setup" && (
          <SetupSection
            email={email}
            setEmail={setEmail}
            teams={teams}
            setTeams={setTeams}
            selectedTeam={selectedTeam}
            setSelectedTeam={setSelectedTeam}
            companyExternalId={companyExternalId}
            setCompanyExternalId={setCompanyExternalId}
            userExternalId={userExternalId}
            setUserExternalId={setUserExternalId}
          />
        )}

        {activeTab === "objectives" && (
          <ObjectivesSection teamExternalId={teamExternalId} />
        )}

        {activeTab === "keyResults" && (
          <KeyResultsSection teamExternalId={teamExternalId} indicatorExternalId={indicatorExternalId} />
        )}

        {activeTab === "risks" && (
          <RisksSection teamExternalId={teamExternalId} />
        )}

        {activeTab === "initiatives" && (
          <InitiativesSection teamExternalId={teamExternalId} userExternalId={userExternalId} />
        )}

        {activeTab === "indicators" && (
          <IndicatorsSection 
            companyExternalId={companyExternalId} 
            onIndicatorCreated={(id) => setIndicatorExternalId(id)} 
          />
        )}

        {activeTab === "indicatorValues" && (
          <IndicatorValuesSection indicatorExternalId={indicatorExternalId} />
        )}

        {activeTab === "indicatorForecasts" && (
          <IndicatorForecastsSection indicatorExternalId={indicatorExternalId} />
        )}

        {activeTab === "milestones" && (
          <MilestonesSection indicatorExternalId={indicatorExternalId} />
        )}

        {activeTab === "sync" && (
          <SyncSection />
        )}
      </div>
    </>
  );
}

export default App;
