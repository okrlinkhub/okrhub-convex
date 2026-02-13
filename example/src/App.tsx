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

function Dialog({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: "#1a1a1a",
          borderRadius: "8px",
          padding: "1.5rem",
          maxWidth: "500px",
          width: "90%",
          maxHeight: "80vh",
          overflowY: "auto",
          border: "1px solid rgba(128, 128, 128, 0.3)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <h3 style={{ margin: 0 }}>{title}</h3>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              fontSize: "1.5rem",
              cursor: "pointer",
              color: "#888",
              padding: "0",
              lineHeight: 1,
            }}
          >
            x
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ============================================================================
// EDIT DIALOGS
// ============================================================================

type ObjectiveItem = {
  _id: string;
  externalId: string;
  title: string;
  description: string;
  teamExternalId: string;
  syncStatus: string;
};

function EditObjectiveDialog({
  item,
  onClose,
  onSave,
}: {
  item: ObjectiveItem;
  onClose: () => void;
  onSave: (data: { title?: string; description?: string }) => Promise<void>;
}) {
  const [title, setTitle] = useState(item.title);
  const [description, setDescription] = useState(item.description);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    await onSave({
      title: title !== item.title ? title : undefined,
      description: description !== item.description ? description : undefined,
    });
    setIsLoading(false);
    onClose();
  };

  return (
    <Dialog title="Edit Objective" onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <FormField label="Title">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            style={{ width: "100%", padding: "0.5rem" }}
          />
        </FormField>
        <FormField label="Description">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            style={{ width: "100%", padding: "0.5rem", minHeight: "60px" }}
          />
        </FormField>
        <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end", marginTop: "1rem" }}>
          <button type="button" onClick={onClose} style={{ backgroundColor: "transparent", border: "1px solid #888" }}>
            Cancel
          </button>
          <button type="submit" disabled={isLoading}>
            {isLoading ? "Saving..." : "Save"}
          </button>
        </div>
      </form>
    </Dialog>
  );
}

type KeyResultItem = {
  _id: string;
  externalId: string;
  objectiveExternalId: string; // Required
  indicatorExternalId: string;
  teamExternalId: string;
  forecastValue?: number;
  targetValue?: number;
  syncStatus: string;
};

function EditKeyResultDialog({
  item,
  objectives,
  onClose,
  onSave,
}: {
  item: KeyResultItem;
  objectives: Array<{ externalId: string; title: string }>;
  onClose: () => void;
  onSave: (data: { objectiveExternalId?: string; forecastValue?: number; targetValue?: number }) => Promise<void>;
}) {
  const [objectiveExternalId, setObjectiveExternalId] = useState(item.objectiveExternalId ?? "");
  const [forecastValue, setForecastValue] = useState(item.forecastValue?.toString() ?? "");
  const [targetValue, setTargetValue] = useState(item.targetValue?.toString() ?? "");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    await onSave({
      objectiveExternalId: objectiveExternalId || undefined,
      forecastValue: forecastValue ? parseFloat(forecastValue) : undefined,
      targetValue: targetValue ? parseFloat(targetValue) : undefined,
    });
    setIsLoading(false);
    onClose();
  };

  return (
    <Dialog title="Edit Key Result" onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <FormField label="Objective">
          <select
            value={objectiveExternalId}
            onChange={(e) => setObjectiveExternalId(e.target.value)}
            style={{ width: "100%", padding: "0.5rem" }}
          >
            <option value="">-- No Objective --</option>
            {objectives.map((obj) => (
              <option key={obj.externalId} value={obj.externalId}>{obj.title}</option>
            ))}
          </select>
        </FormField>
        <FormField label="Forecast Value">
          <input
            type="number"
            value={forecastValue}
            onChange={(e) => setForecastValue(e.target.value)}
            style={{ width: "100%", padding: "0.5rem" }}
          />
        </FormField>
        <FormField label="Target Value">
          <input
            type="number"
            value={targetValue}
            onChange={(e) => setTargetValue(e.target.value)}
            style={{ width: "100%", padding: "0.5rem" }}
          />
        </FormField>
        <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end", marginTop: "1rem" }}>
          <button type="button" onClick={onClose} style={{ backgroundColor: "transparent", border: "1px solid #888" }}>
            Cancel
          </button>
          <button type="submit" disabled={isLoading}>
            {isLoading ? "Saving..." : "Save"}
          </button>
        </div>
      </form>
    </Dialog>
  );
}

type RiskItem = {
  _id: string;
  externalId: string;
  description: string;
  teamExternalId: string;
  priority: "lowest" | "low" | "medium" | "high" | "highest";
  keyResultExternalId: string; // Required
  indicatorExternalId?: string;
  triggerValue?: number;
  triggeredIfLower?: boolean;
  useForecastAsTrigger?: boolean;
  isRed?: boolean;
  syncStatus: string;
};

function EditRiskDialog({
  item,
  keyResults,
  indicators,
  onClose,
  onSave,
}: {
  item: RiskItem;
  keyResults: Array<{ externalId: string; targetValue?: number }>;
  indicators: Array<{ externalId: string; description: string }>;
  onClose: () => void;
  onSave: (data: Partial<RiskItem>) => Promise<void>;
}) {
  const [description, setDescription] = useState(item.description);
  const [priority, setPriority] = useState(item.priority);
  const [keyResultExternalId, setKeyResultExternalId] = useState(item.keyResultExternalId ?? "");
  const [indicatorExternalId, setIndicatorExternalId] = useState(item.indicatorExternalId ?? "");
  const [triggerValue, setTriggerValue] = useState(item.triggerValue?.toString() ?? "");
  const [triggeredIfLower, setTriggeredIfLower] = useState(item.triggeredIfLower ?? false);
  const [useForecastAsTrigger, setUseForecastAsTrigger] = useState(item.useForecastAsTrigger ?? false);
  const [isRed, setIsRed] = useState(item.isRed ?? false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    await onSave({
      description,
      priority,
      keyResultExternalId: keyResultExternalId || undefined,
      indicatorExternalId: indicatorExternalId || undefined,
      triggerValue: triggerValue ? parseFloat(triggerValue) : undefined,
      triggeredIfLower,
      useForecastAsTrigger,
      isRed,
    });
    setIsLoading(false);
    onClose();
  };

  return (
    <Dialog title="Edit Risk" onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <FormField label="Description">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            style={{ width: "100%", padding: "0.5rem", minHeight: "60px" }}
          />
        </FormField>
        <FormField label="Priority">
          <select value={priority} onChange={(e) => setPriority(e.target.value as typeof priority)} style={{ width: "100%", padding: "0.5rem" }}>
            <option value="lowest">Lowest</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="highest">Highest</option>
          </select>
        </FormField>
        <FormField label="Key Result">
          <select value={keyResultExternalId} onChange={(e) => setKeyResultExternalId(e.target.value)} style={{ width: "100%", padding: "0.5rem" }}>
            <option value="">-- No Key Result --</option>
            {keyResults.map((kr) => (
              <option key={kr.externalId} value={kr.externalId}>KR: {kr.targetValue ?? kr.externalId}</option>
            ))}
          </select>
        </FormField>
        <FormField label="KPI Indicator">
          <select value={indicatorExternalId} onChange={(e) => setIndicatorExternalId(e.target.value)} style={{ width: "100%", padding: "0.5rem" }}>
            <option value="">-- No Indicator --</option>
            {indicators.map((ind) => (
              <option key={ind.externalId} value={ind.externalId}>{ind.description}</option>
            ))}
          </select>
        </FormField>
        <FormField label="Trigger Value">
          <input type="number" value={triggerValue} onChange={(e) => setTriggerValue(e.target.value)} style={{ width: "100%", padding: "0.5rem" }} />
        </FormField>
        <div style={{ display: "flex", gap: "1rem", marginBottom: "0.75rem" }}>
          <label style={{ display: "flex", alignItems: "center", gap: "0.25rem", fontSize: "0.85rem" }}>
            <input type="checkbox" checked={triggeredIfLower} onChange={(e) => setTriggeredIfLower(e.target.checked)} /> Triggered if lower
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: "0.25rem", fontSize: "0.85rem" }}>
            <input type="checkbox" checked={useForecastAsTrigger} onChange={(e) => setUseForecastAsTrigger(e.target.checked)} /> Use forecast
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: "0.25rem", fontSize: "0.85rem" }}>
            <input type="checkbox" checked={isRed} onChange={(e) => setIsRed(e.target.checked)} /> Is Red
          </label>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end", marginTop: "1rem" }}>
          <button type="button" onClick={onClose} style={{ backgroundColor: "transparent", border: "1px solid #888" }}>Cancel</button>
          <button type="submit" disabled={isLoading}>{isLoading ? "Saving..." : "Save"}</button>
        </div>
      </form>
    </Dialog>
  );
}

type InitiativeItem = {
  _id: string;
  externalId: string;
  description: string;
  teamExternalId: string;
  riskExternalId: string; // Required
  assigneeExternalId: string;
  createdByExternalId: string;
  status: "ON_TIME" | "OVERDUE" | "FINISHED"; // Required
  priority: "lowest" | "low" | "medium" | "high" | "highest";
  finishedAt?: number;
  syncStatus: string;
};

function EditInitiativeDialog({
  item,
  risks,
  onClose,
  onSave,
}: {
  item: InitiativeItem;
  risks: Array<{ externalId: string; description: string }>;
  onClose: () => void;
  onSave: (data: Partial<InitiativeItem>) => Promise<void>;
}) {
  const [description, setDescription] = useState(item.description);
  const [priority, setPriority] = useState(item.priority);
  const [status, setStatus] = useState(item.status);
  const [riskExternalId, setRiskExternalId] = useState(item.riskExternalId);
  const [finishedAt, setFinishedAt] = useState(item.finishedAt ? new Date(item.finishedAt).toISOString().split("T")[0] : "");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    await onSave({
      description,
      priority,
      status,
      riskExternalId,
      finishedAt: finishedAt ? new Date(finishedAt).getTime() : undefined,
    });
    setIsLoading(false);
    onClose();
  };

  return (
    <Dialog title="Edit Initiative" onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <FormField label="Description">
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} style={{ width: "100%", padding: "0.5rem", minHeight: "60px" }} />
        </FormField>
        <FormField label="Priority">
          <select value={priority} onChange={(e) => setPriority(e.target.value as typeof priority)} style={{ width: "100%", padding: "0.5rem" }}>
            <option value="lowest">Lowest</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="highest">Highest</option>
          </select>
        </FormField>
        <FormField label="Status">
          <select value={status} onChange={(e) => setStatus(e.target.value as typeof status)} style={{ width: "100%", padding: "0.5rem" }}>
            <option value="ON_TIME">On Time</option>
            <option value="OVERDUE">Overdue</option>
            <option value="FINISHED">Finished</option>
          </select>
        </FormField>
        <FormField label="Risk *">
          <select value={riskExternalId} onChange={(e) => setRiskExternalId(e.target.value)} style={{ width: "100%", padding: "0.5rem" }}>
            {risks.map((r) => (
              <option key={r.externalId} value={r.externalId}>{r.description.substring(0, 50)}</option>
            ))}
          </select>
        </FormField>
        <FormField label="Finished At">
          <input type="date" value={finishedAt} onChange={(e) => setFinishedAt(e.target.value)} style={{ width: "100%", padding: "0.5rem" }} />
        </FormField>
        <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end", marginTop: "1rem" }}>
          <button type="button" onClick={onClose} style={{ backgroundColor: "transparent", border: "1px solid #888" }}>Cancel</button>
          <button type="submit" disabled={isLoading}>{isLoading ? "Saving..." : "Save"}</button>
        </div>
      </form>
    </Dialog>
  );
}

type IndicatorItem = {
  _id: string;
  externalId: string;
  companyExternalId: string;
  description: string;
  symbol: string;
  periodicity: "weekly" | "monthly" | "quarterly" | "semesterly" | "yearly";
  isReverse?: boolean;
  syncStatus: string;
};

function EditIndicatorDialog({
  item,
  onClose,
  onSave,
}: {
  item: IndicatorItem;
  onClose: () => void;
  onSave: (data: Partial<IndicatorItem>) => Promise<void>;
}) {
  const [description, setDescription] = useState(item.description);
  const [symbol, setSymbol] = useState(item.symbol);
  const [periodicity, setPeriodicity] = useState(item.periodicity);
  const [isReverse, setIsReverse] = useState(item.isReverse ?? false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    await onSave({
      description,
      symbol,
      periodicity,
      isReverse,
    });
    setIsLoading(false);
    onClose();
  };

  return (
    <Dialog title="Edit Indicator" onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <FormField label="Description">
          <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} style={{ width: "100%", padding: "0.5rem" }} />
        </FormField>
        <FormField label="Symbol">
          <input type="text" value={symbol} onChange={(e) => setSymbol(e.target.value)} style={{ width: "100%", padding: "0.5rem" }} />
        </FormField>
        <FormField label="Periodicity">
          <select value={periodicity} onChange={(e) => setPeriodicity(e.target.value as typeof periodicity)} style={{ width: "100%", padding: "0.5rem" }}>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="quarterly">Quarterly</option>
            <option value="semesterly">Semesterly</option>
            <option value="yearly">Yearly</option>
          </select>
        </FormField>
        <label style={{ display: "flex", alignItems: "center", gap: "0.25rem", fontSize: "0.85rem", marginBottom: "0.75rem" }}>
          <input type="checkbox" checked={isReverse} onChange={(e) => setIsReverse(e.target.checked)} /> Is Reverse
        </label>
        <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end", marginTop: "1rem" }}>
          <button type="button" onClick={onClose} style={{ backgroundColor: "transparent", border: "1px solid #888" }}>Cancel</button>
          <button type="submit" disabled={isLoading}>{isLoading ? "Saving..." : "Save"}</button>
        </div>
      </form>
    </Dialog>
  );
}

type MilestoneItem = {
  _id: string;
  externalId: string;
  indicatorExternalId: string;
  description: string;
  value: number;
  forecastDate?: number;
  status: "ON_TIME" | "OVERDUE" | "ACHIEVED_ON_TIME" | "ACHIEVED_LATE"; // Required
  achievedAt?: number;
  syncStatus: string;
};

function EditMilestoneDialog({
  item,
  onClose,
  onSave,
}: {
  item: MilestoneItem;
  onClose: () => void;
  onSave: (data: Partial<MilestoneItem>) => Promise<void>;
}) {
  const [description, setDescription] = useState(item.description);
  const [value, setValue] = useState(item.value.toString());
  const [forecastDate, setForecastDate] = useState(item.forecastDate ? new Date(item.forecastDate).toISOString().split("T")[0] : "");
  const [status, setStatus] = useState<"ON_TIME" | "OVERDUE" | "ACHIEVED_ON_TIME" | "ACHIEVED_LATE">(item.status);
  const [achievedAt, setAchievedAt] = useState(item.achievedAt ? new Date(item.achievedAt).toISOString().split("T")[0] : "");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    await onSave({
      description,
      value: parseFloat(value),
      forecastDate: forecastDate ? new Date(forecastDate).getTime() : undefined,
      status,
      achievedAt: achievedAt ? new Date(achievedAt).getTime() : undefined,
    });
    setIsLoading(false);
    onClose();
  };

  return (
    <Dialog title="Edit Milestone" onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <FormField label="Description">
          <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} style={{ width: "100%", padding: "0.5rem" }} />
        </FormField>
        <FormField label="Target Value">
          <input type="number" value={value} onChange={(e) => setValue(e.target.value)} style={{ width: "100%", padding: "0.5rem" }} />
        </FormField>
        <FormField label="Status *">
          <select value={status} onChange={(e) => setStatus(e.target.value as typeof status)} style={{ width: "100%", padding: "0.5rem" }}>
            <option value="ON_TIME">On Time</option>
            <option value="OVERDUE">Overdue</option>
            <option value="ACHIEVED_ON_TIME">Achieved On Time</option>
            <option value="ACHIEVED_LATE">Achieved Late</option>
          </select>
        </FormField>
        <FormField label="Forecast Date">
          <input type="date" value={forecastDate} onChange={(e) => setForecastDate(e.target.value)} style={{ width: "100%", padding: "0.5rem" }} />
        </FormField>
        <FormField label="Achieved At">
          <input type="date" value={achievedAt} onChange={(e) => setAchievedAt(e.target.value)} style={{ width: "100%", padding: "0.5rem" }} />
        </FormField>
        <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end", marginTop: "1rem" }}>
          <button type="button" onClick={onClose} style={{ backgroundColor: "transparent", border: "1px solid #888" }}>Cancel</button>
          <button type="submit" disabled={isLoading}>{isLoading ? "Saving..." : "Save"}</button>
        </div>
      </form>
    </Dialog>
  );
}

type IndicatorValueItem = {
  _id: string;
  externalId: string;
  indicatorExternalId: string;
  value: number;
  date: number;
  syncStatus: string;
};

function EditIndicatorValueDialog({
  item,
  onClose,
  onSave,
}: {
  item: IndicatorValueItem;
  onClose: () => void;
  onSave: (data: { value?: number; date?: number }) => Promise<void>;
}) {
  const [value, setValue] = useState(item.value.toString());
  const [date, setDate] = useState(new Date(item.date).toISOString().split("T")[0]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    await onSave({
      value: parseFloat(value),
      date: new Date(date).getTime(),
    });
    setIsLoading(false);
    onClose();
  };

  return (
    <Dialog title="Edit Indicator Value" onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <FormField label="Value">
          <input type="number" value={value} onChange={(e) => setValue(e.target.value)} style={{ width: "100%", padding: "0.5rem" }} />
        </FormField>
        <FormField label="Date">
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ width: "100%", padding: "0.5rem" }} />
        </FormField>
        <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end", marginTop: "1rem" }}>
          <button type="button" onClick={onClose} style={{ backgroundColor: "transparent", border: "1px solid #888" }}>Cancel</button>
          <button type="submit" disabled={isLoading}>{isLoading ? "Saving..." : "Save"}</button>
        </div>
      </form>
    </Dialog>
  );
}

type IndicatorForecastItem = {
  _id: string;
  externalId: string;
  indicatorExternalId: string;
  value: number;
  date: number;
  syncStatus: string;
};

function EditIndicatorForecastDialog({
  item,
  onClose,
  onSave,
}: {
  item: IndicatorForecastItem;
  onClose: () => void;
  onSave: (data: { value?: number; date?: number }) => Promise<void>;
}) {
  const [value, setValue] = useState(item.value.toString());
  const [date, setDate] = useState(new Date(item.date).toISOString().split("T")[0]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    await onSave({
      value: parseFloat(value),
      date: new Date(date).getTime(),
    });
    setIsLoading(false);
    onClose();
  };

  return (
    <Dialog title="Edit Indicator Forecast" onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <FormField label="Value">
          <input type="number" value={value} onChange={(e) => setValue(e.target.value)} style={{ width: "100%", padding: "0.5rem" }} />
        </FormField>
        <FormField label="Date">
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ width: "100%", padding: "0.5rem" }} />
        </FormField>
        <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end", marginTop: "1rem" }}>
          <button type="button" onClick={onClose} style={{ backgroundColor: "transparent", border: "1px solid #888" }}>Cancel</button>
          <button type="submit" disabled={isLoading}>{isLoading ? "Saving..." : "Save"}</button>
        </div>
      </form>
    </Dialog>
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
  const updateObjective = useMutation(api.example.updateObjective);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const [editingItem, setEditingItem] = useState<ObjectiveItem | null>(null);

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
      if (res.success && !res.existing) {
        setResult({ success: true, message: `Created objective: ${res.externalId}` });
        setTitle("");
        setDescription("");
      } else if (res.success && res.existing) {
        setResult({
          success: false,
          message: `Duplicate objective blocked: ${res.externalId} already exists`,
        });
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

  const handleSaveEdit = async (data: { title?: string; description?: string }) => {
    if (!editingItem) return;
    try {
      await updateObjective({ externalId: editingItem.externalId, ...data });
      setResult({ success: true, message: "Objective updated, sync status reset to pending" });
    } catch (err) {
      const errorMessage = err && typeof err === "object" && "message" in err ? (err as { message: string }).message : "Update failed";
      setResult({ success: false, message: errorMessage });
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
              <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                <button onClick={() => setEditingItem(obj as ObjectiveItem)} style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem" }}>Edit</button>
                <StatusBadge status={obj.syncStatus} />
              </div>
            </div>
            <div style={{ fontSize: "0.8rem", color: "#666", marginTop: "0.25rem" }}>{obj.description}</div>
            <code style={{ fontSize: "0.75rem" }}>{obj.externalId}</code>
          </div>
        ))}
        {objectives?.length === 0 && <div style={{ color: "#666", fontStyle: "italic" }}>No objectives yet</div>}
      </div>

      {editingItem && (
        <EditObjectiveDialog
          item={editingItem}
          onClose={() => setEditingItem(null)}
          onSave={handleSaveEdit}
        />
      )}
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
  const updateKeyResult = useMutation(api.example.updateKeyResult);
  const [objectiveExternalId, setObjectiveExternalId] = useState("");
  const [selectedIndicator, setSelectedIndicator] = useState(indicatorExternalId);
  const [forecastValue, setForecastValue] = useState("");
  const [targetValue, setTargetValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const [editingItem, setEditingItem] = useState<KeyResultItem | null>(null);

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
        objectiveExternalId, // Required
        forecastValue: forecastValue ? parseFloat(forecastValue) : undefined,
        targetValue: targetValue ? parseFloat(targetValue) : undefined,
      });
      if (res.success && !res.existing) {
        setResult({ success: true, message: `Created key result: ${res.externalId}` });
        setObjectiveExternalId("");
        setForecastValue("");
        setTargetValue("");
      } else if (res.success && res.existing) {
        setResult({
          success: false,
          message: `Duplicate key result blocked: ${res.externalId} already exists`,
        });
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
        <h4 style={{ marginBottom: "0.5rem", color: "#646cff" }}>Required Fields</h4>
        <FormField label="Objective *">
          <select
            value={objectiveExternalId}
            onChange={(e) => setObjectiveExternalId(e.target.value)}
            style={{ width: "100%", padding: "0.5rem" }}
          >
            <option value="">-- Select Objective --</option>
            {objectives?.map((obj) => (
              <option key={obj._id} value={obj.externalId}>{obj.title}</option>
            ))}
          </select>
        </FormField>
        <FormField label="Indicator *">
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

        <h4 style={{ marginBottom: "0.5rem", marginTop: "1rem", color: "#888" }}>Optional Fields</h4>
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
        <button type="submit" disabled={isLoading || !teamExternalId || !effectiveIndicatorId || !objectiveExternalId}>
          {isLoading ? "Creating..." : "Create Key Result"}
        </button>
        {(!teamExternalId || !effectiveIndicatorId || !objectiveExternalId) && (
          <span style={{ marginLeft: "0.5rem", color: "#f44336", fontSize: "0.85rem" }}>
            Need team, objective and indicator
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
              <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                <button onClick={() => setEditingItem(kr as KeyResultItem)} style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem" }}>Edit</button>
                <StatusBadge status={kr.syncStatus} />
              </div>
            </div>
            <code style={{ fontSize: "0.75rem" }}>{kr.externalId}</code>
          </div>
        ))}
        {keyResults?.length === 0 && <div style={{ color: "#666", fontStyle: "italic" }}>No key results yet</div>}
      </div>

      {editingItem && objectives && (
        <EditKeyResultDialog
          item={editingItem}
          objectives={objectives.map(o => ({ externalId: o.externalId, title: o.title }))}
          onClose={() => setEditingItem(null)}
          onSave={async (data) => {
            await updateKeyResult({ externalId: editingItem.externalId, ...data });
            setResult({ success: true, message: "Key result updated, sync status reset to pending" });
          }}
        />
      )}
    </div>
  );
}

// ============================================================================
// RISKS SECTION
// ============================================================================

function RisksSection({ teamExternalId }: { teamExternalId: string }) {
  const risks = useQuery(api.example.listAllRisks);
  const keyResults = useQuery(api.example.listAllKeyResults);
  const indicators = useQuery(api.example.listAllIndicators);
  const createRisk = useMutation(api.example.createRisk);
  const updateRisk = useMutation(api.example.updateRisk);
  const [description, setDescription] = useState("");
  const [keyResultExternalId, setKeyResultExternalId] = useState("");
  const [priority, setPriority] = useState<"lowest" | "low" | "medium" | "high" | "highest">("medium");
  // Optional KPI trigger fields
  const [indicatorExternalId, setIndicatorExternalId] = useState("");
  const [triggerValue, setTriggerValue] = useState("");
  const [triggeredIfLower, setTriggeredIfLower] = useState(false);
  const [useForecastAsTrigger, setUseForecastAsTrigger] = useState(false);
  const [isRed, setIsRed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const [editingItem, setEditingItem] = useState<RiskItem | null>(null);

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
        keyResultExternalId, // Required
        priority,
        indicatorExternalId: indicatorExternalId || undefined,
        triggerValue: triggerValue ? parseFloat(triggerValue) : undefined,
        triggeredIfLower: triggeredIfLower || undefined,
        useForecastAsTrigger: useForecastAsTrigger || undefined,
        isRed: isRed || undefined,
      });
      if (res.success && !res.existing) {
        setResult({ success: true, message: `Created risk: ${res.externalId}` });
        setDescription("");
        setKeyResultExternalId("");
        setIndicatorExternalId("");
        setTriggerValue("");
        setTriggeredIfLower(false);
        setUseForecastAsTrigger(false);
        setIsRed(false);
      } else if (res.success && res.existing) {
        setResult({
          success: false,
          message: `Duplicate risk blocked: ${res.externalId} already exists`,
        });
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
        <h4 style={{ marginBottom: "0.5rem", color: "#646cff" }}>Required Fields</h4>
        <FormField label="Description *">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Risk description"
            style={{ width: "100%", padding: "0.5rem", minHeight: "60px" }}
          />
        </FormField>
        <FormField label="Priority *">
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
        <FormField label="Key Result *">
          <select
            value={keyResultExternalId}
            onChange={(e) => setKeyResultExternalId(e.target.value)}
            style={{ width: "100%", padding: "0.5rem" }}
          >
            <option value="">-- Select Key Result --</option>
            {keyResults?.map((kr) => (
              <option key={kr._id} value={kr.externalId}>KR: {kr.targetValue ?? kr.externalId}</option>
            ))}
          </select>
        </FormField>

        <h4 style={{ marginBottom: "0.5rem", marginTop: "1rem", color: "#888" }}>Optional Fields</h4>
        <FormField label="KPI Trigger Indicator">
          <select
            value={indicatorExternalId}
            onChange={(e) => setIndicatorExternalId(e.target.value)}
            style={{ width: "100%", padding: "0.5rem" }}
          >
            <option value="">-- No Indicator --</option>
            {indicators?.map((ind) => (
              <option key={ind._id} value={ind.externalId}>{ind.description}</option>
            ))}
          </select>
        </FormField>
        <FormField label="Trigger Value">
          <input
            type="number"
            value={triggerValue}
            onChange={(e) => setTriggerValue(e.target.value)}
            placeholder="Value that triggers the risk"
            style={{ width: "100%", padding: "0.5rem" }}
          />
        </FormField>
        <div style={{ display: "flex", gap: "1rem", marginBottom: "0.75rem" }}>
          <label style={{ display: "flex", alignItems: "center", gap: "0.25rem", fontSize: "0.85rem" }}>
            <input
              type="checkbox"
              checked={triggeredIfLower}
              onChange={(e) => setTriggeredIfLower(e.target.checked)}
            />
            Triggered if lower
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: "0.25rem", fontSize: "0.85rem" }}>
            <input
              type="checkbox"
              checked={useForecastAsTrigger}
              onChange={(e) => setUseForecastAsTrigger(e.target.checked)}
            />
            Use forecast as trigger
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: "0.25rem", fontSize: "0.85rem" }}>
            <input
              type="checkbox"
              checked={isRed}
              onChange={(e) => setIsRed(e.target.checked)}
            />
            Is Red (critical)
          </label>
        </div>
        <button type="submit" disabled={isLoading || !teamExternalId || !keyResultExternalId}>
          {isLoading ? "Creating..." : "Create Risk"}
        </button>
        {(!teamExternalId || !keyResultExternalId) && (
          <span style={{ marginLeft: "0.5rem", color: "#f44336", fontSize: "0.85rem" }}>
            Need team and key result
          </span>
        )}
      </form>

      {result && <ResultMessage success={result.success} message={result.message} />}

      <h3>Local Risks ({risks?.length ?? 0})</h3>
      <div style={{ maxHeight: "300px", overflowY: "auto" }}>
        {risks?.map((risk) => (
          <div key={risk._id} style={{ padding: "0.75rem", marginBottom: "0.5rem", backgroundColor: "rgba(128, 128, 128, 0.1)", borderRadius: "4px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <strong>{risk.priority.toUpperCase()}</strong>
              <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                <button onClick={() => setEditingItem(risk as RiskItem)} style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem" }}>Edit</button>
                <StatusBadge status={risk.syncStatus} />
              </div>
            </div>
            <div style={{ fontSize: "0.8rem", color: "#666", marginTop: "0.25rem" }}>{risk.description}</div>
            <code style={{ fontSize: "0.75rem" }}>{risk.externalId}</code>
          </div>
        ))}
        {risks?.length === 0 && <div style={{ color: "#666", fontStyle: "italic" }}>No risks yet</div>}
      </div>

      {editingItem && keyResults && indicators && (
        <EditRiskDialog
          item={editingItem}
          keyResults={keyResults.map(kr => ({ externalId: kr.externalId, targetValue: kr.targetValue }))}
          indicators={indicators.map(i => ({ externalId: i.externalId, description: i.description }))}
          onClose={() => setEditingItem(null)}
          onSave={async (data) => {
            await updateRisk({ externalId: editingItem.externalId, ...data });
            setResult({ success: true, message: "Risk updated, sync status reset to pending" });
          }}
        />
      )}
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
  const updateInitiative = useMutation(api.example.updateInitiative);
  const [description, setDescription] = useState("");
  const [riskExternalId, setRiskExternalId] = useState("");
  const [priority, setPriority] = useState<"lowest" | "low" | "medium" | "high" | "highest">("medium");
  const [status, setStatus] = useState<"ON_TIME" | "OVERDUE" | "FINISHED">("ON_TIME");
  // Optional fields
  const [finishedAt, setFinishedAt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const [editingItem, setEditingItem] = useState<InitiativeItem | null>(null);

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
        riskExternalId, // Required
        priority,
        status,
        finishedAt: finishedAt ? new Date(finishedAt).getTime() : undefined,
      });
      if (res.success && !res.existing) {
        setResult({ success: true, message: `Created initiative: ${res.externalId}` });
        setDescription("");
        setRiskExternalId("");
        setFinishedAt("");
      } else if (res.success && res.existing) {
        setResult({
          success: false,
          message: `Duplicate initiative blocked: ${res.externalId} already exists`,
        });
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
        <h4 style={{ marginBottom: "0.5rem", color: "#646cff" }}>Required Fields</h4>
        <FormField label="Description *">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Initiative description"
            style={{ width: "100%", padding: "0.5rem", minHeight: "60px" }}
          />
        </FormField>
        <FormField label="Priority *">
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
        <FormField label="Risk *">
          <select
            value={riskExternalId}
            onChange={(e) => setRiskExternalId(e.target.value)}
            style={{ width: "100%", padding: "0.5rem" }}
          >
            <option value="">-- Select Risk --</option>
            {risks?.map((risk) => (
              <option key={risk._id} value={risk.externalId}>{risk.description.substring(0, 50)}</option>
            ))}
          </select>
        </FormField>

        <h4 style={{ marginBottom: "0.5rem", marginTop: "1rem", color: "#888" }}>Optional Fields</h4>
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
        <FormField label="Finished At">
          <input
            type="date"
            value={finishedAt}
            onChange={(e) => setFinishedAt(e.target.value)}
            style={{ width: "100%", padding: "0.5rem" }}
          />
        </FormField>
        <button type="submit" disabled={isLoading || !teamExternalId || !userExternalId || !riskExternalId}>
          {isLoading ? "Creating..." : "Create Initiative"}
        </button>
        {(!userExternalId || !riskExternalId) && <span style={{ marginLeft: "0.5rem", color: "#f44336", fontSize: "0.85rem" }}>Need user ID and risk</span>}
      </form>

      {result && <ResultMessage success={result.success} message={result.message} />}

      <h3>Local Initiatives ({initiatives?.length ?? 0})</h3>
      <div style={{ maxHeight: "300px", overflowY: "auto" }}>
        {initiatives?.map((init) => (
          <div key={init._id} style={{ padding: "0.75rem", marginBottom: "0.5rem", backgroundColor: "rgba(128, 128, 128, 0.1)", borderRadius: "4px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <strong>{init.status}</strong>
              <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                <button onClick={() => setEditingItem(init as InitiativeItem)} style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem" }}>Edit</button>
                <StatusBadge status={init.syncStatus} />
              </div>
            </div>
            <div style={{ fontSize: "0.8rem", color: "#666", marginTop: "0.25rem" }}>{init.description}</div>
            <code style={{ fontSize: "0.75rem" }}>{init.externalId}</code>
          </div>
        ))}
        {initiatives?.length === 0 && <div style={{ color: "#666", fontStyle: "italic" }}>No initiatives yet</div>}
      </div>

      {editingItem && risks && (
        <EditInitiativeDialog
          item={editingItem}
          risks={risks.map(r => ({ externalId: r.externalId, description: r.description }))}
          onClose={() => setEditingItem(null)}
          onSave={async (data) => {
            await updateInitiative({ externalId: editingItem.externalId, ...data });
            setResult({ success: true, message: "Initiative updated, sync status reset to pending" });
          }}
        />
      )}
    </div>
  );
}

// ============================================================================
// INDICATORS SECTION
// ============================================================================

function IndicatorsSection({ companyExternalId, onIndicatorCreated }: { companyExternalId: string; onIndicatorCreated: (id: string) => void }) {
  const indicators = useQuery(api.example.listAllIndicators);
  const createIndicator = useMutation(api.example.createIndicator);
  const updateIndicator = useMutation(api.example.updateIndicator);
  const [description, setDescription] = useState("");
  const [symbol, setSymbol] = useState("");
  const [periodicity, setPeriodicity] = useState<"weekly" | "monthly" | "quarterly" | "semesterly" | "yearly">("monthly");
  // Optional fields
  const [isReverse, setIsReverse] = useState(false);
  const [editingItem, setEditingItem] = useState<IndicatorItem | null>(null);
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
        isReverse: isReverse || undefined,
      });
      if (res.success && !res.existing) {
        setResult({ success: true, message: `Created indicator: ${res.externalId}` });
        onIndicatorCreated(res.externalId);
        setDescription("");
        setSymbol("");
        setIsReverse(false);
      } else if (res.success && res.existing) {
        setResult({
          success: false,
          message: `Duplicate indicator blocked: ${res.externalId} already exists`,
        });
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
        <h4 style={{ marginBottom: "0.5rem", color: "#646cff" }}>Required Fields</h4>
        <FormField label="Description *">
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Indicator description"
            style={{ width: "100%", padding: "0.5rem" }}
          />
        </FormField>
        <FormField label="Symbol *">
          <input
            type="text"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            placeholder="e.g., %, $, units"
            style={{ width: "100%", padding: "0.5rem" }}
          />
        </FormField>
        <FormField label="Periodicity *">
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

        <h4 style={{ marginBottom: "0.5rem", marginTop: "1rem", color: "#888" }}>Optional Fields</h4>
        <label style={{ display: "flex", alignItems: "center", gap: "0.25rem", fontSize: "0.85rem", marginBottom: "0.75rem" }}>
          <input
            type="checkbox"
            checked={isReverse}
            onChange={(e) => setIsReverse(e.target.checked)}
          />
          Is Reverse (lower is better)
        </label>
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
              <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                <button onClick={() => setEditingItem(ind as IndicatorItem)} style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem" }}>Edit</button>
                <StatusBadge status={ind.syncStatus} />
              </div>
            </div>
            <div style={{ fontSize: "0.8rem", color: "#666", marginTop: "0.25rem" }}>
              {ind.symbol} | {ind.periodicity}
            </div>
            <code style={{ fontSize: "0.75rem" }}>{ind.externalId}</code>
          </div>
        ))}
        {indicators?.length === 0 && <div style={{ color: "#666", fontStyle: "italic" }}>No indicators yet</div>}
      </div>

      {editingItem && (
        <EditIndicatorDialog
          item={editingItem}
          onClose={() => setEditingItem(null)}
          onSave={async (data) => {
            await updateIndicator({ externalId: editingItem.externalId, ...data });
            setResult({ success: true, message: "Indicator updated, sync status reset to pending" });
          }}
        />
      )}
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
  const updateValue = useMutation(api.example.updateIndicatorValue);
  const [selectedIndicator, setSelectedIndicator] = useState(indicatorExternalId);
  const [value, setValue] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const [editingItem, setEditingItem] = useState<IndicatorValueItem | null>(null);

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
      if (res.success && !res.existing) {
        setResult({ success: true, message: `Created value: ${res.externalId}` });
        setValue("");
      } else if (res.success && res.existing) {
        setResult({
          success: false,
          message: `Duplicate indicator value blocked: ${res.externalId} already exists`,
        });
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
              <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                <button onClick={() => setEditingItem(val as IndicatorValueItem)} style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem" }}>Edit</button>
                <StatusBadge status={val.syncStatus} />
              </div>
            </div>
            <div style={{ fontSize: "0.8rem", color: "#666" }}>{new Date(val.date).toLocaleDateString()}</div>
          </div>
        ))}
        {values?.length === 0 && <div style={{ color: "#666", fontStyle: "italic" }}>No values yet</div>}
      </div>

      {editingItem && (
        <EditIndicatorValueDialog
          item={editingItem}
          onClose={() => setEditingItem(null)}
          onSave={async (data) => {
            await updateValue({ externalId: editingItem.externalId, ...data });
            setResult({ success: true, message: "Value updated, sync status reset to pending" });
          }}
        />
      )}
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
  const updateForecast = useMutation(api.example.updateIndicatorForecast);
  const [selectedIndicator, setSelectedIndicator] = useState(indicatorExternalId);
  const [value, setValue] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const [editingItem, setEditingItem] = useState<IndicatorForecastItem | null>(null);

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
      if (res.success && !res.existing) {
        setResult({ success: true, message: `Created forecast: ${res.externalId}` });
        setValue("");
      } else if (res.success && res.existing) {
        setResult({
          success: false,
          message: `Duplicate indicator forecast blocked: ${res.externalId} already exists`,
        });
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
              <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                <button onClick={() => setEditingItem(fc as IndicatorForecastItem)} style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem" }}>Edit</button>
                <StatusBadge status={fc.syncStatus} />
              </div>
            </div>
            <div style={{ fontSize: "0.8rem", color: "#666" }}>{new Date(fc.date).toLocaleDateString()}</div>
          </div>
        ))}
        {forecasts?.length === 0 && <div style={{ color: "#666", fontStyle: "italic" }}>No forecasts yet</div>}
      </div>

      {editingItem && (
        <EditIndicatorForecastDialog
          item={editingItem}
          onClose={() => setEditingItem(null)}
          onSave={async (data) => {
            await updateForecast({ externalId: editingItem.externalId, ...data });
            setResult({ success: true, message: "Forecast updated, sync status reset to pending" });
          }}
        />
      )}
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
  const updateMilestone = useMutation(api.example.updateMilestone);
  const [selectedIndicator, setSelectedIndicator] = useState(indicatorExternalId);
  const [description, setDescription] = useState("");
  const [value, setValue] = useState("");
  const [editingItem, setEditingItem] = useState<MilestoneItem | null>(null);
  // Status is required with default ON_TIME
  const [status, setStatus] = useState<"ON_TIME" | "OVERDUE" | "ACHIEVED_ON_TIME" | "ACHIEVED_LATE">("ON_TIME");
  // Optional fields
  const [forecastDate, setForecastDate] = useState("");
  const [achievedAt, setAchievedAt] = useState("");
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
        forecastDate: forecastDate ? new Date(forecastDate).getTime() : undefined,
        status, // Required, default ON_TIME
        achievedAt: achievedAt ? new Date(achievedAt).getTime() : undefined,
      });
      if (res.success && !res.existing) {
        setResult({ success: true, message: `Created milestone: ${res.externalId}` });
        setDescription("");
        setValue("");
        setForecastDate("");
        setStatus("ON_TIME");
        setAchievedAt("");
      } else if (res.success && res.existing) {
        setResult({
          success: false,
          message: `Duplicate milestone blocked: ${res.externalId} already exists`,
        });
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
        <h4 style={{ marginBottom: "0.5rem", color: "#646cff" }}>Required Fields</h4>
        <FormField label="Indicator *">
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
        <FormField label="Description *">
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Milestone description"
            style={{ width: "100%", padding: "0.5rem" }}
          />
        </FormField>
        <FormField label="Target Value *">
          <input
            type="number"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="100"
            style={{ width: "100%", padding: "0.5rem" }}
          />
        </FormField>
        <FormField label="Status *">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as typeof status)}
            style={{ width: "100%", padding: "0.5rem" }}
          >
            <option value="ON_TIME">On Time</option>
            <option value="OVERDUE">Overdue</option>
            <option value="ACHIEVED_ON_TIME">Achieved On Time</option>
            <option value="ACHIEVED_LATE">Achieved Late</option>
          </select>
        </FormField>

        <h4 style={{ marginBottom: "0.5rem", marginTop: "1rem", color: "#888" }}>Optional Fields</h4>
        <FormField label="Forecast Date">
          <input
            type="date"
            value={forecastDate}
            onChange={(e) => setForecastDate(e.target.value)}
            style={{ width: "100%", padding: "0.5rem" }}
          />
        </FormField>
        <FormField label="Achieved At">
          <input
            type="date"
            value={achievedAt}
            onChange={(e) => setAchievedAt(e.target.value)}
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
              <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                <button onClick={() => setEditingItem(ms as MilestoneItem)} style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem" }}>Edit</button>
                <StatusBadge status={ms.syncStatus} />
              </div>
            </div>
            <div style={{ fontSize: "0.8rem", color: "#666" }}>Target: {ms.value}</div>
            <code style={{ fontSize: "0.75rem" }}>{ms.externalId}</code>
          </div>
        ))}
        {milestones?.length === 0 && <div style={{ color: "#666", fontStyle: "italic" }}>No milestones yet</div>}
      </div>

      {editingItem && (
        <EditMilestoneDialog
          item={editingItem}
          onClose={() => setEditingItem(null)}
          onSave={async (data) => {
            await updateMilestone({ externalId: editingItem.externalId, ...data });
            setResult({ success: true, message: "Milestone updated, sync status reset to pending" });
          }}
        />
      )}
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
