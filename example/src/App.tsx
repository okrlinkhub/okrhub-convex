import "./App.css";
import { useMutation, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { useState } from "react";

function SyncQueueStatus() {
  const pendingItems = useQuery(api.example.listPendingSync, {});

  return (
    <div
      style={{
        marginTop: "1.5rem",
        padding: "1rem",
        border: "1px solid rgba(128, 128, 128, 0.3)",
        borderRadius: "8px",
      }}
    >
      <h4 style={{ marginTop: 0, marginBottom: "1rem" }}>
        Sync Queue ({pendingItems?.length ?? 0} pending)
      </h4>
      <ul style={{ textAlign: "left", listStyle: "none", padding: 0 }}>
        {pendingItems?.map((item) => (
          <li
            key={item._id}
            style={{
              marginBottom: "0.5rem",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.5rem",
              backgroundColor: "rgba(128, 128, 128, 0.1)",
              borderRadius: "4px",
            }}
          >
            <span
              style={{
                padding: "0.25rem 0.5rem",
                fontSize: "0.75rem",
                backgroundColor:
                  item.status === "pending"
                    ? "#ff9800"
                    : item.status === "success"
                      ? "#4caf50"
                      : "#f44336",
                color: "white",
                borderRadius: "4px",
              }}
            >
              {item.status}
            </span>
            <span style={{ fontWeight: "bold" }}>{item.entityType}</span>
            <span style={{ flex: 1, fontSize: "0.85rem", color: "#666" }}>
              {item.externalId}
            </span>
          </li>
        ))}
        {pendingItems?.length === 0 && (
          <li
            style={{ color: "rgba(128, 128, 128, 0.8)", fontStyle: "italic" }}
          >
            No items in sync queue
          </li>
        )}
      </ul>
    </div>
  );
}

function CreateObjectiveForm() {
  const createObjective = useMutation(api.example.createObjectiveExample);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    externalId?: string;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;

    setIsLoading(true);
    setResult(null);

    try {
      const res = await createObjective({
        title,
        description,
        teamExternalId: "example-app:team:00000000-0000-0000-0000-000000000001",
      });
      setResult(res);
      setTitle("");
      setDescription("");
    } catch (error) {
      console.error("Failed to create objective:", error);
      setResult({ success: false });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      style={{
        marginBottom: "2rem",
        padding: "1.5rem",
        border: "1px solid rgba(128, 128, 128, 0.3)",
        borderRadius: "8px",
      }}
    >
      <h2 style={{ marginTop: 0 }}>Create Objective</h2>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: "1rem" }}>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Objective title"
            style={{ padding: "0.5rem", width: "100%", marginBottom: "0.5rem" }}
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Objective description"
            style={{ padding: "0.5rem", width: "100%", minHeight: "80px" }}
          />
        </div>
        <button type="submit" disabled={isLoading}>
          {isLoading ? "Creating..." : "Create Objective"}
        </button>
      </form>
      {result && (
        <div
          style={{
            marginTop: "1rem",
            padding: "0.75rem",
            backgroundColor: result.success
              ? "rgba(76, 175, 80, 0.1)"
              : "rgba(244, 67, 54, 0.1)",
            borderRadius: "4px",
            fontSize: "0.9rem",
          }}
        >
          {result.success ? (
            <>
              Created objective with externalId:{" "}
              <code>{result.externalId}</code>
            </>
          ) : (
            "Failed to create objective"
          )}
        </div>
      )}
    </div>
  );
}

function App() {
  return (
    <>
      <h1>OKRHub Component Demo</h1>
      <div className="card">
        <p style={{ marginBottom: "1.5rem", color: "#666" }}>
          This example demonstrates how to use the OKRHub Convex component to
          sync OKR data (Objectives, Key Results, Risks, Initiatives) to
          LinkHub.
        </p>

        <CreateObjectiveForm />

        <SyncQueueStatus />

        <div
          style={{
            marginTop: "1.5rem",
            padding: "1rem",
            backgroundColor: "rgba(128, 128, 128, 0.1)",
            borderRadius: "8px",
          }}
        >
          <h3>How it works</h3>
          <ol style={{ textAlign: "left", lineHeight: "1.8" }}>
            <li>
              Create an objective using the form above - this generates an{" "}
              <code>externalId</code>
            </li>
            <li>
              The objective is added to the sync queue with status{" "}
              <code>pending</code>
            </li>
            <li>
              Call <code>processSyncQueue</code> to send pending items to
              LinkHub API
            </li>
            <li>
              LinkHub maps the <code>externalId</code> to an internal Convex{" "}
              <code>_id</code>
            </li>
          </ol>
        </div>

        <p style={{ marginTop: "1.5rem", fontSize: "0.9rem" }}>
          See <code>example/convex/example.ts</code> for the component usage
          patterns
        </p>
      </div>
    </>
  );
}

export default App;
