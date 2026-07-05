export interface GraphProperty {
  key: string;
  value: unknown;
}

export interface GraphNode {
  id: string;
  labels: string[];
  displayName: string;
  properties: GraphProperty[];
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
}

export interface GraphRelationship {
  id: string;
  type: string;
  source: string;
  target: string;
  properties: GraphProperty[];
}

export interface GraphDbData {
  nodes: GraphNode[];
  relationships: GraphRelationship[];
}

export function buildGraphDb(
  records: any[],
  config?: {
    sourceTable?: string;
    sourceLabel?: string;
  }
): GraphDbData {
  const nodes = new Map<string, GraphNode>();
  const relationships: GraphRelationship[] = [];
  let relIndex = 0;

  const addNode = (
    id: string,
    labels: string[],
    displayName: string,
    properties: GraphProperty[]
  ) => {
    const existing = nodes.get(id);
    if (existing) {
      // Merge properties, keep first labels
      const keys = new Set(existing.properties.map((p) => p.key));
      for (const p of properties) {
        if (!keys.has(p.key)) {
          existing.properties.push(p);
          keys.add(p.key);
        }
      }
      return existing;
    }
    const node: GraphNode = {
      id,
      labels,
      displayName,
      properties,
    };
    nodes.set(id, node);
    return node;
  };

  const addRelationship = (type: string, source: string, target: string) => {
    relationships.push({
      id: `rel-${relIndex++}`,
      type,
      source,
      target,
      properties: [],
    });
  };

  const sourceLabel = config?.sourceLabel || "Record";
  const sourceTable = config?.sourceTable || "source";

  const referenceFields = ["cost_center", "mv_detail"];
  const relationshipMap: Record<string, string> = {
    cost_center: "HAS_COST_CENTER",
    mv_detail: "HAS_MV_DETAIL",
  };
  const targetLabelMap: Record<string, string> = {
    cost_center: "CostCenter",
    mv_detail: "MVDetail",
  };
  const targetNameField: Record<string, string> = {
    cost_center: "cost_center_code",
    mv_detail: "mv_detail",
  };

  for (const record of records) {
    const recordId = record.sys_id || `rec-${relIndex}`;
    const recordProperties: GraphProperty[] = Object.entries(record)
      .filter(
        ([key]) =>
          !key.endsWith("_sys_id") &&
          !key.endsWith("_label") &&
          !referenceFields.includes(key)
      )
      .map(([key, value]) => ({ key, value }));

    addNode(
      recordId,
      [sourceLabel],
      record.cost_center_code || recordId,
      recordProperties
    );

    for (const field of referenceFields) {
      const value = record[field];
      if (!value) continue;

      const sysIdKey = `${field}_sys_id`;
      const labelKey = `${field}_label`;
      const targetId = record[sysIdKey] || value;
      const targetName =
        record[labelKey] ||
        record[targetNameField[field]] ||
        targetId;
      const targetLabel = targetLabelMap[field] || field;
      const relType = relationshipMap[field] || `HAS_${targetLabel.toUpperCase()}`;

      const targetProps: GraphProperty[] = [
        { key: "source_table", value: sourceTable },
        { key: "source_field", value: field },
      ];
      if (record[targetNameField[field]]) {
        targetProps.push({
          key: targetNameField[field],
          value: record[targetNameField[field]],
        });
      }

      addNode(targetId, [targetLabel], targetName, targetProps);

      if (field === "mv_detail") {
        addRelationship(relType, targetId, recordId);
      } else {
        addRelationship(relType, recordId, targetId);
      }
    }
  }

  return {
    nodes: Array.from(nodes.values()),
    relationships,
  };
}
