import type { StyleDefinition, StyleRule, CustomShape, VesselTableFilter, FilterCombinator, ClusterConfig } from "./types";

const SHAPE_MAP: Record<string, string> = {
  circle: "circle",
  square: "square",
  triangle: "triangle",
  star: "star",
  cross: "cross",
  x: "x",
};

const ROTATION_ELEMENT = `
            <sld:Rotation>
              <ogc:PropertyName>heading_current_consensusvalue</ogc:PropertyName>
            </sld:Rotation>`;

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function isSvgContent(shape: string): boolean {
  return shape.trim().startsWith("<svg") || shape.trim().startsWith("<?xml");
}

function getShapeGraphic(
  shape: string,
  color: string,
  size: number,
  styleName: string,
  customShapes: CustomShape[]
): string {
  let shapeContent = shape;

  if (shape === "custom") {
    shapeContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
  <polygon points="12,2 20,18 12,15 4,18" fill="param(fill)" stroke="param(outline)" stroke-width="1.5" stroke-linejoin="round" />
  <circle cx="12" cy="10" r="2" fill="#FFF" opacity="0.8" />
  <line x1="12" y1="6" x2="12" y2="14" stroke="#FFF" stroke-width="1" opacity="0.7" />
</svg>`;
  } else {
    const custom = customShapes.find((cs) => cs.id === shape);
    if (custom) {
      shapeContent = custom.svg;
    }
  }

  if (isSvgContent(shapeContent)) {
    const colorHex = color.replace("#", "");
    const resourceName = `${styleName}_${colorHex}_svg`;

    return `<sld:ExternalGraphic>
                <sld:OnlineResource xlink:type="simple" xlink:href="${resourceName}.svg" xmlns:xlink="http://www.w3.org/1999/xlink"/>
                <sld:Format>image/svg+xml</sld:Format>
              </sld:ExternalGraphic>
              <sld:Size>${size}</sld:Size>`;
  }

  const wellKnownName = SHAPE_MAP[shapeContent.toLowerCase()] ?? "circle";
  return `<sld:Mark>
                <sld:WellKnownName>${wellKnownName}</sld:WellKnownName>
                <sld:Fill>
                  <sld:CssParameter name="fill">${color}</sld:CssParameter>
                  <sld:CssParameter name="fill-opacity">0.8</sld:CssParameter>
                </sld:Fill>
                <sld:Stroke>
                  <sld:CssParameter name="stroke">#000000</sld:CssParameter>
                  <sld:CssParameter name="stroke-width">1</sld:CssParameter>
                </sld:Stroke>
              </sld:Mark>
              <sld:Size>${size}</sld:Size>`;
}

function buildOgcFilter(
  conditions: VesselTableFilter[],
  combinator: FilterCombinator
): string | null {
  const valid = conditions.filter(
    (c) => c.column && c.value !== undefined && c.value !== null && c.value.trim() !== ""
  );
  if (valid.length === 0) return null;
  if (valid.length === 1) return buildSingleCondition(valid[0]);

  const ogcOperator = combinator === "OR" ? "ogc:Or" : "ogc:And";
  const inner = valid.map(buildSingleCondition).join("\n            ");
  return `<${ogcOperator}>
            ${inner}
          </${ogcOperator}>`;
}

function buildSingleCondition(filter: VesselTableFilter): string {
  const { column, operator, value } = filter;
  const isNumeric = isNumericColumn(column);
  const escaped = escapeXml(value);

  switch (operator) {
    case "=":
      return isNumeric
        ? `<ogc:PropertyIsEqualTo><ogc:PropertyName>${column}</ogc:PropertyName><ogc:Literal>${escaped}</ogc:Literal></ogc:PropertyIsEqualTo>`
        : `<ogc:PropertyIsEqualTo><ogc:PropertyName>${column}</ogc:PropertyName><ogc:Literal>${escaped}</ogc:Literal></ogc:PropertyIsEqualTo>`;
    case "!=":
      return `<ogc:PropertyIsNotEqualTo><ogc:PropertyName>${column}</ogc:PropertyName><ogc:Literal>${escaped}</ogc:Literal></ogc:PropertyIsNotEqualTo>`;
    case "<":
      return `<ogc:PropertyIsLessThan><ogc:PropertyName>${column}</ogc:PropertyName><ogc:Literal>${escaped}</ogc:Literal></ogc:PropertyIsLessThan>`;
    case "<=":
      return `<ogc:PropertyIsLessThanOrEqualTo><ogc:PropertyName>${column}</ogc:PropertyName><ogc:Literal>${escaped}</ogc:Literal></ogc:PropertyIsLessThanOrEqualTo>`;
    case ">":
      return `<ogc:PropertyIsGreaterThan><ogc:PropertyName>${column}</ogc:PropertyName><ogc:Literal>${escaped}</ogc:Literal></ogc:PropertyIsGreaterThan>`;
    case ">=":
      return `<ogc:PropertyIsGreaterThanOrEqualTo><ogc:PropertyName>${column}</ogc:PropertyName><ogc:Literal>${escaped}</ogc:Literal></ogc:PropertyIsGreaterThanOrEqualTo>`;
    case "startsWith":
      return `<ogc:PropertyIsLike wildCard="*" singleChar="_" escape="!"><ogc:PropertyName>${column}</ogc:PropertyName><ogc:Literal>${escaped}*</ogc:Literal></ogc:PropertyIsLike>`;
    case "endsWith":
      return `<ogc:PropertyIsLike wildCard="*" singleChar="_" escape="!"><ogc:PropertyName>${column}</ogc:PropertyName><ogc:Literal>*${escaped}</ogc:Literal></ogc:PropertyIsLike>`;
    case "contains":
      return `<ogc:PropertyIsLike wildCard="*" singleChar="_" escape="!"><ogc:PropertyName>${column}</ogc:PropertyName><ogc:Literal>*${escaped}*</ogc:Literal></ogc:PropertyIsLike>`;
    default:
      return "";
  }
}

function isNumericColumn(column: string): boolean {
  const numericSuffixes = [
    "_lat", "_lon", "_timestamp", "_value", "_count", "_rate",
    "_historylimit", "_history", "_lastobservedvalue", "_variabilityscore",
    "_consensusvalue", "_lastupdatets", "_turnrate", "_accelerationmps2",
    "_distancemeters", "_headingchangedeg", "_headingdeg", "_jerkmps3",
    "_speedovergroundmps", "_timedeltaseconds", "_windowseconds",
    "_level", "_total", "_current", "_eta", "_buildyear",
    "_epfdtype", "_maneuverindicator", "_positionaccuracy",
    "_radiostatus", "_navstatus", "_s2", "mmsi", "imo", "id",
  ];
  return numericSuffixes.some((suffix) => column.toLowerCase().endsWith(suffix));
}

export interface SldAsset {
  resourceName: string;
  svgContent: string;
}

export interface SldResult {
  sldXml: string;
  assets: SldAsset[];
}

export function generateSld(
  styleName: string,
  defaultStyle: StyleDefinition,
  rules: StyleRule[],
  customShapes: CustomShape[],
  cluster: ClusterConfig
): SldResult {
  const assets: SldAsset[] = [];
  const ruleXmls: string[] = [];

  for (const rule of rules) {
    const filterXml = buildOgcFilter(rule.conditions, rule.combinator);
    if (!filterXml) continue;

    const graphic = getShapeGraphic(
      rule.style.shape,
      rule.style.color,
      rule.style.size,
      `${styleName}_rule_${rule.id}`,
      customShapes
    );

    if (isSvgContent(rule.style.shape) || rule.style.shape === "custom" || customShapes.find((cs) => cs.id === rule.style.shape)) {
      const colorHex = rule.style.color.replace("#", "");
      const resourceName = `${styleName}_rule_${rule.id}_${colorHex}_svg`;
      let svgContent = rule.style.shape === "custom" ? "" : (customShapes.find((cs) => cs.id === rule.style.shape)?.svg ?? rule.style.shape);
      if (rule.style.shape === "custom") {
        svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><polygon points="12,2 20,18 12,15 4,18" fill="param(fill)" stroke="param(outline)" stroke-width="1.5" stroke-linejoin="round" /><circle cx="12" cy="10" r="2" fill="#FFF" opacity="0.8" /><line x1="12" y1="6" x2="12" y2="14" stroke="#FFF" stroke-width="1" opacity="0.7" /></svg>`;
      }
      if (svgContent) {
        assets.push({
          resourceName,
          svgContent: svgContent
            .replace(/param\(fill\)/g, rule.style.color)
            .replace(/param\(outline\)/g, rule.style.color),
        });
      }
    }

    ruleXmls.push(`
        <sld:Rule>
          <sld:Name>${escapeXml(rule.name)}</sld:Name>
          <sld:Title>${escapeXml(rule.name)}</sld:Title>
          <sld:MinScaleDenominator>1</sld:MinScaleDenominator>
          <sld:MaxScaleDenominator>18500000</sld:MaxScaleDenominator>
          <ogc:Filter>
            ${filterXml}
          </ogc:Filter>
          <sld:PointSymbolizer>
            <sld:Graphic>
              ${graphic}${ROTATION_ELEMENT}
            </sld:Graphic>
          </sld:PointSymbolizer>
        </sld:Rule>`);
  }

  const defaultGraphic = getShapeGraphic(
    defaultStyle.shape,
    defaultStyle.color,
    defaultStyle.size,
    `${styleName}_default`,
    customShapes
  );

  if (isSvgContent(defaultStyle.shape) || defaultStyle.shape === "custom" || customShapes.find((cs) => cs.id === defaultStyle.shape)) {
    const colorHex = defaultStyle.color.replace("#", "");
    const resourceName = `${styleName}_default_${colorHex}_svg`;
    let svgContent = defaultStyle.shape === "custom" ? "" : (customShapes.find((cs) => cs.id === defaultStyle.shape)?.svg ?? defaultStyle.shape);
    if (defaultStyle.shape === "custom") {
      svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><polygon points="12,2 20,18 12,15 4,18" fill="param(fill)" stroke="param(outline)" stroke-width="1.5" stroke-linejoin="round" /><circle cx="12" cy="10" r="2" fill="#FFF" opacity="0.8" /><line x1="12" y1="6" x2="12" y2="14" stroke="#FFF" stroke-width="1" opacity="0.7" /></svg>`;
    }
    if (svgContent) {
      assets.push({
        resourceName,
        svgContent: svgContent
          .replace(/param\(fill\)/g, defaultStyle.color)
          .replace(/param\(outline\)/g, defaultStyle.color),
      });
    }
  }

  const defaultRule = `
        <sld:Rule>
          <sld:Name>Default_Vessels</sld:Name>
          <sld:Title>Default vessels</sld:Title>
          <sld:MinScaleDenominator>1</sld:MinScaleDenominator>
          <sld:MaxScaleDenominator>18500000</sld:MaxScaleDenominator>
          <sld:ElseFilter/>
          <sld:PointSymbolizer>
            <sld:Graphic>
              ${defaultGraphic}${ROTATION_ELEMENT}
            </sld:Graphic>
          </sld:PointSymbolizer>
        </sld:Rule>`;

  const allRules = [...ruleXmls, defaultRule].join("\n");

  const c = cluster;

  const sldXml = `<?xml version="1.0" encoding="UTF-8"?>
<sld:StyledLayerDescriptor xmlns:sld="http://www.opengis.net/sld" xmlns:gml="http://www.opengis.net/gml" xmlns:ogc="http://www.opengis.net/ogc" version="1.0.0">
  <sld:NamedLayer>
    <sld:Name>vessels</sld:Name>
    <sld:UserStyle>
      <sld:Name>${escapeXml(styleName)}</sld:Name>
      <sld:Title>Vessel Style with Rules</sld:Title>
      <sld:Abstract>Style for vessel visualization with CQL rules and clustering</sld:Abstract>
      <sld:FeatureTypeStyle>
${allRules}
      </sld:FeatureTypeStyle>
      <sld:FeatureTypeStyle>
        <sld:Transformation>
          <ogc:Function name="gs:PointStacker">
            <ogc:Function name="parameter"><ogc:Literal>data</ogc:Literal></ogc:Function>
            <ogc:Function name="parameter"><ogc:Literal>cellSize</ogc:Literal><ogc:Literal>${c.cellSize}</ogc:Literal></ogc:Function>
            <ogc:Function name="parameter"><ogc:Literal>outputBBOX</ogc:Literal><ogc:Function name="env"><ogc:Literal>wms_bbox</ogc:Literal></ogc:Function></ogc:Function>
            <ogc:Function name="parameter"><ogc:Literal>outputWidth</ogc:Literal><ogc:Function name="env"><ogc:Literal>wms_width</ogc:Literal></ogc:Function></ogc:Function>
            <ogc:Function name="parameter"><ogc:Literal>outputHeight</ogc:Literal><ogc:Function name="env"><ogc:Literal>wms_height</ogc:Literal></ogc:Function></ogc:Function>
          </ogc:Function>
        </sld:Transformation>
        <sld:Rule>
          <sld:Name>Clustered Single Vessel</sld:Name>
          <sld:MinScaleDenominator>${c.minScaleDenominator}</sld:MinScaleDenominator>
          <ogc:Filter><ogc:PropertyIsEqualTo><ogc:PropertyName>count</ogc:PropertyName><ogc:Literal>1</ogc:Literal></ogc:PropertyIsEqualTo></ogc:Filter>
          <sld:PointSymbolizer>
            <sld:Graphic>
              <sld:Mark>
                <sld:WellKnownName>circle</sld:WellKnownName>
                <sld:Fill><sld:CssParameter name="fill">${defaultStyle.color}</sld:CssParameter><sld:CssParameter name="fill-opacity">0.9</sld:CssParameter></sld:Fill>
                <sld:Stroke><sld:CssParameter name="stroke">#000000</sld:CssParameter><sld:CssParameter name="stroke-width">1</sld:CssParameter></sld:Stroke>
              </sld:Mark>
              <sld:Size>${defaultStyle.size}</sld:Size>
            </sld:Graphic>
          </sld:PointSymbolizer>
        </sld:Rule>
        <sld:Rule>
          <sld:Name>Small Cluster</sld:Name>
          <sld:MinScaleDenominator>${c.minScaleDenominator}</sld:MinScaleDenominator>
          <ogc:Filter><ogc:And><ogc:PropertyIsGreaterThan><ogc:PropertyName>count</ogc:PropertyName><ogc:Literal>1</ogc:Literal></ogc:PropertyIsGreaterThan><ogc:PropertyIsLessThanOrEqualTo><ogc:PropertyName>count</ogc:PropertyName><ogc:Literal>${c.smallClusterMax}</ogc:Literal></ogc:PropertyIsLessThanOrEqualTo></ogc:And></ogc:Filter>
          <sld:PointSymbolizer>
            <sld:Graphic>
              <sld:Mark>
                <sld:WellKnownName>circle</sld:WellKnownName>
                <sld:Fill><sld:CssParameter name="fill">${c.smallClusterColor}</sld:CssParameter><sld:CssParameter name="fill-opacity">0.9</sld:CssParameter></sld:Fill>
                <sld:Stroke><sld:CssParameter name="stroke">#000000</sld:CssParameter><sld:CssParameter name="stroke-width">2</sld:CssParameter></sld:Stroke>
              </sld:Mark>
              <sld:Size>${c.smallClusterSize}</sld:Size>
            </sld:Graphic>
          </sld:PointSymbolizer>
          <sld:TextSymbolizer>
            <sld:Label><ogc:PropertyName>count</ogc:PropertyName></sld:Label>
            <sld:Font><sld:CssParameter name="font-family">Arial</sld:CssParameter><sld:CssParameter name="font-size">10</sld:CssParameter><sld:CssParameter name="font-weight">bold</sld:CssParameter></sld:Font>
            <sld:LabelPlacement><sld:PointPlacement><sld:AnchorPoint><sld:AnchorPointX>0.5</sld:AnchorPointX><sld:AnchorPointY>0.5</sld:AnchorPointY></sld:AnchorPoint></sld:PointPlacement></sld:LabelPlacement>
            <sld:Fill><sld:CssParameter name="fill">${c.clusterLabelColor}</sld:CssParameter></sld:Fill>
          </sld:TextSymbolizer>
        </sld:Rule>
        <sld:Rule>
          <sld:Name>Large Cluster</sld:Name>
          <sld:MinScaleDenominator>${c.minScaleDenominator}</sld:MinScaleDenominator>
          <ogc:Filter><ogc:PropertyIsGreaterThan><ogc:PropertyName>count</ogc:PropertyName><ogc:Literal>${c.smallClusterMax}</ogc:Literal></ogc:PropertyIsGreaterThan></ogc:Filter>
          <sld:PointSymbolizer>
            <sld:Graphic>
              <sld:Mark>
                <sld:WellKnownName>circle</sld:WellKnownName>
                <sld:Fill><sld:CssParameter name="fill">${c.largeClusterColor}</sld:CssParameter><sld:CssParameter name="fill-opacity">0.9</sld:CssParameter></sld:Fill>
                <sld:Stroke><sld:CssParameter name="stroke">#000000</sld:CssParameter><sld:CssParameter name="stroke-width">2</sld:CssParameter></sld:Stroke>
              </sld:Mark>
              <sld:Size>${c.largeClusterSize}</sld:Size>
            </sld:Graphic>
          </sld:PointSymbolizer>
          <sld:TextSymbolizer>
            <sld:Label><ogc:PropertyName>count</ogc:PropertyName></sld:Label>
            <sld:Font><sld:CssParameter name="font-family">Arial</sld:CssParameter><sld:CssParameter name="font-size">11</sld:CssParameter><sld:CssParameter name="font-weight">bold</sld:CssParameter></sld:Font>
            <sld:LabelPlacement><sld:PointPlacement><sld:AnchorPoint><sld:AnchorPointX>0.5</sld:AnchorPointX><sld:AnchorPointY>0.5</sld:AnchorPointY></sld:AnchorPoint></sld:PointPlacement></sld:LabelPlacement>
            <sld:Fill><sld:CssParameter name="fill">${c.clusterLabelColor}</sld:CssParameter></sld:Fill>
          </sld:TextSymbolizer>
        </sld:Rule>
      </sld:FeatureTypeStyle>
    </sld:UserStyle>
  </sld:NamedLayer>
</sld:StyledLayerDescriptor>`;

  return { sldXml, assets };
}
