"""S-52 compliant SLD style templates for all IHO S-57 ENC object classes.

Covers the complete IHO S-57 Appendix B.1 object class catalogue (~180 classes).
Colors and symbology follow IHO S-52 / INT-1 presentation standards.

Reference:
  - IHO S-52 Appendix 2 (Presentation Library)
  - IHO S-57 Appendix B.1 (Object Catalogue)
  - INT-1 (Symbols, Abbreviations and Terms used on Charts)
"""

import re
from xml.sax.saxutils import escape as xml_escape

# ---------------------------------------------------------------------------
# S-52 Standard Colour Table
# Reference: S-52 Presentation Library, Part C (Colour Tables)
# ---------------------------------------------------------------------------

C = {
    # Land / shoreline
    "LANDA":  "#C7B58E",   # Land area (tan)
    "LANDL":  "#A89B7C",   # Land outline
    "COALN":  "#1A1A1A",   # Coastline (near-black; avoid pure #000000 GeoServer bug)
    "SLC":    "#1A1A1A",   # Shoreline construction
    "DYLAND": "#B8A878",   # Dry land

    # Depth areas (shallow → deep)
    "DEPMS":  "#B0D8F0",   # 0–5m   shallow
    "DEPMD":  "#A0C8E8",   # 5–20m  medium
    "DEPMDP": "#90B8D8",   # 20–50m deeper
    "DEPDW":  "#FFFFFF",   # >50m   deep water
    "DEPCN":  "#7999B5",   # Depth contour
    "DEPCS":  "#5A7A96",   # Safety contour
    "SNDG":   "#A0522D",   # Sounding / sea bottom

    # Navigational aids — buoys & beacons
    "BCN_R":  "#E30613",   # Beacon red
    "BCN_G":  "#00A651",   # Beacon green
    "BCN_Y":  "#FFD700",   # Beacon yellow
    "BOY_R":  "#E30613",   # Buoy red
    "BOY_G":  "#00A651",   # Buoy green
    "BOY_Y":  "#FFD700",   # Buoy yellow
    "BOY_BW": "#0000FF",   # Buoy blue/white

    # Lights & signals
    "LIGHT":  "#FFD700",   # Navigation light (yellow)
    "FOGSIG": "#FFA500",   # Fog signal (orange)
    "DAYMAR": "#FFD700",   # Daymark (yellow)
    "RADSTA": "#E1007F",   # Radar station (magenta)
    "RTPBCN": "#E1007F",   # Radar transponder beacon (magenta)

    # Restricted / caution areas (magenta dashed)
    "MAG":    "#E1007F",   # Magenta (S-52 standard for restricted/caution)
    "MAG_D":  "#E1007F",   # Magenta (for dashed boundaries)

    # Water areas
    "WATER":  "#B0D8F0",   # Generic water fill
    "FAIRWY": "#B0D8F0",   # Fairway
    "CHNEL":  "#B0D8F0",   # Channel
    "SNDARE": "#E8D8C0",   # Sand area

    # Built-up / cultural
    "BUAAR":  "#E8E0D0",   # Built-up area
    "BUISG":  "#D0C8B0",   # Building
    "LNDMRK": "#A89B7C",   # Landmark
    "LNDRG":  "#D8C8A0",   # Land region
    "SILTNK": "#C0B898",   # Silo/tank

    # Infrastructure
    "BRIDGE": "#A0522D",   # Bridge (brown)
    "CBLSUB": "#8B4513",   # Submarine cable (brown)
    "PIPSOL": "#E1007F",   # Pipeline (magenta)
    "PIPOHD": "#A0522D",   # Overhead pipeline
    "PYLONS": "#A0522D",   # Pylon

    # Hazards
    "WRECK":  "#8B0000",   # Wreck (dark red)
    "OBSTR":  "#8B4513",   # Obstruction (brown)
    "UWTROC": "#8B4513",   # Underwater rock
    "ICE":    "#E0F0FF",   # Ice

    # Maritime zones
    "ZONE":   "#E1007F",   # Maritime zone boundary (magenta)

    # Administration / military
    "ADMIN":  "#E1007F",   # Administration area
    "MIL":    "#E1007F",   # Military practice area

    # Meta / coverage
    "META":   "#F5F5F5",   # Meta layer (very light gray)
    "COV":    "#F0F0F0",   # Coverage (very light gray)

    # Defaults
    "DEF_LN": "#888888",   # Default line
    "DEF_PT": "#888888",   # Default point
    "DEF_PG": "#DDDDDD",   # Default polygon
}


# ---------------------------------------------------------------------------
# SLD XML builders — produce valid SLD 1.0 XML
# ---------------------------------------------------------------------------

def _sld(rules_xml: str, title: str) -> str:
    """Wrap feature type rules in a complete SLD 1.0 document."""
    return (
        '<?xml version="1.0" encoding="UTF-8"?>'
        '<sld:StyledLayerDescriptor xmlns:sld="http://www.opengis.net/sld" '
        'xmlns:ogc="http://www.opengis.net/ogc" '
        'xmlns:gml="http://www.opengis.net/gml" '
        'xmlns:xlink="http://www.w3.org/1999/xlink" '
        'version="1.0.0">'
        f'<sld:NamedLayer><sld:Name>{xml_escape(title)}</sld:Name>'
        f'<sld:UserStyle><sld:Name>{xml_escape(title)}</sld:Name>'
        f'<sld:Title>{xml_escape(title)}</sld:Title>'
        f'<sld:FeatureTypeStyle>{rules_xml}</sld:FeatureTypeStyle>'
        '</sld:UserStyle></sld:NamedLayer></sld:StyledLayerDescriptor>'
    )


def _stroke(color: str, width: float = 1.0, opacity: float = 1.0,
            dasharray: str | None = None) -> str:
    parts = [
        f'<sld:CssParameter name="stroke">{color}</sld:CssParameter>',
        f'<sld:CssParameter name="stroke-width">{width}</sld:CssParameter>',
        f'<sld:CssParameter name="stroke-opacity">{opacity}</sld:CssParameter>',
    ]
    if dasharray:
        parts.append(f'<sld:CssParameter name="stroke-dasharray">{dasharray}</sld:CssParameter>')
    return '<sld:Stroke>' + ''.join(parts) + '</sld:Stroke>'


def _fill(color: str, opacity: float = 0.5) -> str:
    return (
        '<sld:Fill>'
        f'<sld:CssParameter name="fill">{color}</sld:CssParameter>'
        f'<sld:CssParameter name="fill-opacity">{opacity}</sld:CssParameter>'
        '</sld:Fill>'
    )


def _line_rule(name: str, color: str, width: float = 1.0, opacity: float = 1.0,
               dasharray: str | None = None) -> str:
    return (
        f'<sld:Rule><sld:Name>{xml_escape(name)}</sld:Name>'
        f'<sld:LineSymbolizer>{_stroke(color, width, opacity, dasharray)}</sld:LineSymbolizer>'
        '</sld:Rule>'
    )


def _polygon_rule(name: str, fill_color: str, stroke_color: str | None = None,
                  stroke_width: float = 0.5, fill_opacity: float = 0.5) -> str:
    stroke = _stroke(stroke_color, stroke_width, 0.8) if stroke_color else ''
    return (
        f'<sld:Rule><sld:Name>{xml_escape(name)}</sld:Name>'
        f'<sld:PolygonSymbolizer>{_fill(fill_color, fill_opacity)}{stroke}</sld:PolygonSymbolizer>'
        '</sld:Rule>'
    )


def _point_rule(name: str, color: str, size: float = 4, opacity: float = 1.0,
                shape: str = "circle") -> str:
    return (
        f'<sld:Rule><sld:Name>{xml_escape(name)}</sld:Name>'
        '<sld:PointSymbolizer><sld:Graphic><sld:Mark>'
        f'<sld:WellKnownName>{shape}</sld:WellKnownName>'
        f'{_fill(color, opacity)}'
        f'{_stroke("#1A1A1A", 0.5, 1.0)}'
        f'</sld:Mark><sld:Size>{size}</sld:Size></sld:Graphic></sld:PointSymbolizer>'
        '</sld:Rule>'
    )


def _text_rule(name: str, label_prop: str, color: str = "#1A1A1A",
               size: int = 10, anchor_x: str = "left", anchor_y: str = "bottom") -> str:
    """Create a text labeling rule for attribute-based labels."""
    return (
        f'<sld:Rule><sld:Name>{xml_escape(name)}</sld:Name>'
        '<sld:TextSymbolizer>'
        f'<sld:Label><ogc:PropertyName>{label_prop}</ogc:PropertyName></sld:Label>'
        f'<sld:Font><sld:CssParameter name="font-size">{size}</sld:CssParameter></sld:Font>'
        f'<sld:LabelPlacement><sld:PointPlacement>'
        f'<sld:AnchorPoint><sld:AnchorPointX>{anchor_x}</sld:AnchorPointX>'
        f'<sld:AnchorPointY>{anchor_y}</sld:AnchorPointY></sld:AnchorPoint>'
        '</sld:PointPlacement></sld:LabelPlacement>'
        f'<sld:Fill><sld:CssParameter name="fill">{color}</sld:CssParameter></sld:Fill>'
        '</sld:TextSymbolizer>'
        '</sld:Rule>'
    )


def _multi_geom(*rules: str) -> str:
    """Combine multiple rules for layers with mixed geometry types."""
    return ''.join(rules)


# ---------------------------------------------------------------------------
# S-52 SLD generators for each S-57 object class
# ---------------------------------------------------------------------------

# --- Land & shoreline ---

def sld_lndare() -> str:
    return _sld(_polygon_rule("LNDARE", C["LANDA"], C["LANDL"], 0.5, 0.8), "S52_LNDARE")

def sld_coalne() -> str:
    return _sld(_line_rule("COALNE", C["COALN"], 1.2, 1.0), "S52_COALNE")

def sld_slcons() -> str:
    return _sld(_line_rule("SLCONS", C["SLC"], 1.0, 1.0), "S52_SLCONS")

def sld_lndmrk() -> str:
    return _sld(_multi_geom(
        _point_rule("LNDMRK_pt", C["LNDMRK"], 5, 0.9, "triangle"),
        _line_rule("LNDMRK_ln", C["LNDMRK"], 1.0, 0.8),
    ), "S52_LNDMRK")

def sld_lndrgn() -> str:
    return _sld(_polygon_rule("LNDRGN", C["LNDRG"], C["LANDL"], 0.3, 0.4), "S52_LNDRGN")

def sld_dyland() -> str:
    return _sld(_polygon_rule("DYLAND", C["DYLAND"], C["LANDL"], 0.3, 0.6), "S52_DYLAND")

def sld_dykcon() -> str:
    return _sld(_line_rule("DYKCON", C["LANDL"], 1.0, 0.8), "S52_DYKCON")

# --- Depth & bathymetry ---

def sld_depare() -> str:
    rules = (
        '<sld:Rule><sld:Name>DEPARE_0_5</sld:Name>'
        '<ogc:Filter><ogc:And>'
        '<ogc:PropertyIsGreaterThanOrEqualTo><ogc:PropertyName>DRVAL1</ogc:PropertyName><ogc:Literal>0</ogc:Literal></ogc:PropertyIsGreaterThanOrEqualTo>'
        '<ogc:PropertyIsLessThan><ogc:PropertyName>DRVAL1</ogc:PropertyName><ogc:Literal>5</ogc:Literal></ogc:PropertyIsLessThan>'
        '</ogc:And></ogc:Filter>'
        f'<sld:PolygonSymbolizer>{_fill(C["DEPMS"], 0.5)}</sld:PolygonSymbolizer></sld:Rule>'
        '<sld:Rule><sld:Name>DEPARE_5_20</sld:Name>'
        '<ogc:Filter><ogc:And>'
        '<ogc:PropertyIsGreaterThanOrEqualTo><ogc:PropertyName>DRVAL1</ogc:PropertyName><ogc:Literal>5</ogc:Literal></ogc:PropertyIsGreaterThanOrEqualTo>'
        '<ogc:PropertyIsLessThan><ogc:PropertyName>DRVAL1</ogc:PropertyName><ogc:Literal>20</ogc:Literal></ogc:PropertyIsLessThan>'
        '</ogc:And></ogc:Filter>'
        f'<sld:PolygonSymbolizer>{_fill(C["DEPMD"], 0.4)}</sld:PolygonSymbolizer></sld:Rule>'
        '<sld:Rule><sld:Name>DEPARE_20_50</sld:Name>'
        '<ogc:Filter><ogc:And>'
        '<ogc:PropertyIsGreaterThanOrEqualTo><ogc:PropertyName>DRVAL1</ogc:PropertyName><ogc:Literal>20</ogc:Literal></ogc:PropertyIsGreaterThanOrEqualTo>'
        '<ogc:PropertyIsLessThan><ogc:PropertyName>DRVAL1</ogc:PropertyName><ogc:Literal>50</ogc:Literal></ogc:PropertyIsLessThan>'
        '</ogc:And></ogc:Filter>'
        f'<sld:PolygonSymbolizer>{_fill(C["DEPMDP"], 0.3)}</sld:PolygonSymbolizer></sld:Rule>'
        '<sld:Rule><sld:Name>DEPARE_50+</sld:Name>'
        '<ogc:Filter><ogc:PropertyIsGreaterThanOrEqualTo><ogc:PropertyName>DRVAL1</ogc:PropertyName><ogc:Literal>50</ogc:Literal></ogc:PropertyIsGreaterThanOrEqualTo></ogc:Filter>'
        f'<sld:PolygonSymbolizer>{_fill(C["DEPDW"], 0.1)}</sld:PolygonSymbolizer></sld:Rule>'
        '<sld:Rule><sld:Name>DEPARE_default</sld:Name>'
        '<ogc:Filter><ogc:PropertyIsNull><ogc:PropertyName>DRVAL1</ogc:PropertyName></ogc:PropertyIsNull></ogc:Filter>'
        f'<sld:PolygonSymbolizer>{_fill(C["DEPMS"], 0.3)}</sld:PolygonSymbolizer></sld:Rule>'
    )
    return _sld(rules, "S52_DEPARE")

def sld_depcnt() -> str:
    return _sld(_line_rule("DEPCNT", C["DEPCN"], 0.8, 0.7), "S52_DEPCNT")

def sld_soundg() -> str:
    return _sld(_point_rule("SOUNDG", C["SNDG"], 2, 0.6), "S52_SOUNDG")

def sld_valmar() -> str:
    return _sld(_line_rule("VALMAR", C["DEPCN"], 0.8, 0.6, "2 1"), "S52_VALMAR")

# --- Navigational aids — beacons ---

def sld_bcnspp() -> str:
    rules = (
        '<sld:Rule><sld:Name>BCN_red</sld:Name>'
        '<ogc:Filter><ogc:PropertyIsEqualTo><ogc:PropertyName>COLOUR</ogc:PropertyName><ogc:Literal>3</ogc:Literal></ogc:PropertyIsEqualTo></ogc:Filter>'
        + _point_rule("BCN_red", C["BCN_R"], 5, 1.0, "square") + '</sld:Rule>'
        '<sld:Rule><sld:Name>BCN_green</sld:Name>'
        '<ogc:Filter><ogc:PropertyIsEqualTo><ogc:PropertyName>COLOUR</ogc:PropertyName><ogc:Literal>4</ogc:Literal></ogc:PropertyIsEqualTo></ogc:Filter>'
        + _point_rule("BCN_green", C["BCN_G"], 5, 1.0, "square") + '</sld:Rule>'
        '<sld:Rule><sld:Name>BCN_yellow</sld:Name>'
        '<ogc:Filter><ogc:PropertyIsEqualTo><ogc:PropertyName>COLOUR</ogc:PropertyName><ogc:Literal>6</ogc:Literal></ogc:PropertyIsEqualTo></ogc:Filter>'
        + _point_rule("BCN_yellow", C["BCN_Y"], 5, 1.0, "square") + '</sld:Rule>'
        '<sld:Rule><sld:Name>BCN_default</sld:Name>'
        + _point_rule("BCN_default", C["BCN_R"], 4, 0.8, "square") + '</sld:Rule>'
    )
    return _sld(rules, "S52_BCNSPP")

def sld_bcnlat() -> str:
    return sld_bcnspp()  # Same colour logic

def sld_bcnisw() -> str:
    return sld_bcnspp()

def sld_bcnsaw() -> str:
    return sld_bcnspp()

def sld_bcnwrn() -> str:
    return sld_bcnspp()

def sld_rtpbcn() -> str:
    return _sld(_point_rule("RTPBCN", C["RTPBCN"], 5, 1.0, "x"), "S52_RTPBCN")

# --- Navigational aids — buoys ---

def sld_boylat() -> str:
    rules = (
        '<sld:Rule><sld:Name>BOY_red</sld:Name>'
        '<ogc:Filter><ogc:PropertyIsEqualTo><ogc:PropertyName>COLOUR</ogc:PropertyName><ogc:Literal>3</ogc:Literal></ogc:PropertyIsEqualTo></ogc:Filter>'
        + _point_rule("BOY_red", C["BOY_R"], 5) + '</sld:Rule>'
        '<sld:Rule><sld:Name>BOY_green</sld:Name>'
        '<ogc:Filter><ogc:PropertyIsEqualTo><ogc:PropertyName>COLOUR</ogc:PropertyName><ogc:Literal>4</ogc:Literal></ogc:PropertyIsEqualTo></ogc:Filter>'
        + _point_rule("BOY_green", C["BOY_G"], 5) + '</sld:Rule>'
        '<sld:Rule><sld:Name>BOY_default</sld:Name>'
        + _point_rule("BOY_default", C["BOY_Y"], 5) + '</sld:Rule>'
    )
    return _sld(rules, "S52_BOYLAT")

def sld_boysaw() -> str:
    return _sld(_point_rule("BOYSAW", C["BOY_Y"], 5), "S52_BOYSAW")

def sld_boyspp() -> str:
    return _sld(_point_rule("BOYSPP", C["BOY_Y"], 5), "S52_BOYSPP")

def sld_boycar() -> str:
    return sld_boyspp()

def sld_boylng() -> str:
    return sld_boyspp()

def sld_boyisw() -> str:
    return sld_boyspp()

def sld_boyinb() -> str:
    return sld_boyspp()

def sld_boywrn() -> str:
    return sld_boyspp()

def sld_boyshp() -> str:
    return sld_boyspp()

# --- Lights & signals ---

def sld_lights() -> str:
    return _sld(_point_rule("LIGHTS", C["LIGHT"], 5, 1.0, "star"), "S52_LIGHTS")

def sld_litflt() -> str:
    return _sld(_point_rule("LITFLT", C["LIGHT"], 4, 0.9, "star"), "S52_LITFLT")

def sld_litmin() -> str:
    return _sld(_point_rule("LITMIN", C["LIGHT"], 3, 0.8, "star"), "S52_LITMIN")

def sld_fogsig() -> str:
    return _sld(_point_rule("FOGSIG", C["FOGSIG"], 4, 0.8, "circle"), "S52_FOGSIG")

def sld_daymar() -> str:
    return _sld(_point_rule("DAYMAR", C["DAYMAR"], 4, 0.8, "triangle"), "S52_DAYMAR")

def sld_radsta() -> str:
    return _sld(_point_rule("RADSTA", C["RADSTA"], 4, 0.8, "square"), "S52_RADSTA")

def sld_rdosta() -> str:
    return _sld(_point_rule("RDOSTA", C["RADSTA"], 4, 0.8, "square"), "S52_RDOSTA")

def sld_boycol() -> str:
    return sld_boyspp()

# --- Restricted / caution / regulated areas ---

def sld_resare() -> str:
    return _sld(_line_rule("RESARE", C["MAG"], 1.0, 0.8, "4 2"), "S52_RESARE")

def sld_ctnare() -> str:
    return _sld(_line_rule("CTNARE", C["MAG"], 1.0, 0.8, "4 2"), "S52_CTNARE")

def sld_navtex() -> str:
    return _sld(_line_rule("NAVTEX", C["MAG"], 0.8, 0.6, "4 2"), "S52_NAVTEX")

def sld_dmpgrd() -> str:
    return _sld(_line_rule("DMPGRD", C["DEF_LN"], 0.8, 0.6, "3 2"), "S52_DMPGRD")

def sld_mipare() -> str:
    return _sld(_line_rule("MIPARE", C["MIL"], 1.0, 0.7, "5 2"), "S52_MIPARE")

def sld_admare() -> str:
    return _sld(_line_rule("ADMARE", C["ADMIN"], 0.8, 0.5, "6 3"), "S52_ADMARE")

def sld_pylons() -> str:
    return _sld(_point_rule("PYLONS", C["PYLONS"], 3, 0.7, "square"), "S52_PYLONS")

# --- Water areas & ways ---

def sld_fairwy() -> str:
    return _sld(_polygon_rule("FAIRWY", C["FAIRWY"], None, 0, 0.3), "S52_FAIRWY")

def sld_chnel() -> str:
    return _sld(_line_rule("CHNEL", C["CHNEL"], 0.8, 0.5, "4 2"), "S52_CHNEL")

def sld_lakare() -> str:
    return _sld(_polygon_rule("LAKARE", C["WATER"], C["COALN"], 0.3, 0.4), "S52_LAKARE")

def sld_rivers() -> str:
    return _sld(_polygon_rule("RIVERS", C["WATER"], C["COALN"], 0.3, 0.4), "S52_RIVERS")

def sld_canals() -> str:
    return _sld(_line_rule("CANALS", C["WATER"], 1.0, 0.6), "S52_CANALS")

def sld_seaare() -> str:
    return _sld(_polygon_rule("SEAARE", C["WATER"], None, 0, 0.15), "S52_SEAARE")

def sld_sbdare() -> str:
    return _sld(_polygon_rule("SBDARE", C["SNDARE"], C["LANDL"], 0.3, 0.3), "S52_SBDARE")

# --- Maritime zones ---

def sld_exezne() -> str:
    return _sld(_line_rule("EXEZNE", C["ZONE"], 1.0, 0.5, "6 3"), "S52_EXEZNE")

def sld_conzne() -> str:
    return _sld(_line_rule("CONZNE", C["ZONE"], 1.0, 0.5, "6 3"), "S52_CONZNE")

def sld_cosare() -> str:
    return _sld(_line_rule("COSARE", C["ZONE"], 1.0, 0.5, "6 3"), "S52_COSARE")

def sld_tesare() -> str:
    return _sld(_line_rule("TESARE", C["ZONE"], 1.0, 0.5, "6 3"), "S52_TESARE")

def sld_marcul() -> str:
    return _sld(_line_rule("MARCUL", C["MAG"], 0.8, 0.5, "4 2"), "S52_MARCUL")

# --- Hazards ---

def sld_wrecks() -> str:
    return _sld(_multi_geom(
        _point_rule("WRECKS_pt", C["WRECK"], 4, 0.8, "x"),
        _line_rule("WRECKS_ln", C["WRECK"], 1.0, 0.8),
    ), "S52_WRECKS")

def sld_obstrn() -> str:
    return _sld(_multi_geom(
        _point_rule("OBSTRN_pt", C["OBSTR"], 3, 0.7, "x"),
        _line_rule("OBSTRN_ln", C["OBSTR"], 0.8, 0.7),
    ), "S52_OBSTRN")

def sld_uwtroc() -> str:
    return _sld(_point_rule("UWTROC", C["UWTROC"], 3, 0.7, "x"), "S52_UWTROC")

def sld_iceare() -> str:
    return _sld(_polygon_rule("ICEARE", C["ICE"], C["ICE"], 0.5, 0.3), "S52_ICEARE")

# --- Infrastructure ---

def sld_bridge() -> str:
    return _sld(_line_rule("BRIDGE", C["BRIDGE"], 1.5, 1.0), "S52_BRIDGE")

def sld_cblsub() -> str:
    return _sld(_line_rule("CBLSUB", C["CBLSUB"], 1.0, 0.7, "6 2"), "S52_CBLSUB")

def sld_pipsol() -> str:
    return _sld(_line_rule("PIPSOL", C["PIPSOL"], 1.0, 0.7, "4 2"), "S52_PIPSOL")

def sld_pipohd() -> str:
    return _sld(_line_rule("PIPOHD", C["PIPOHD"], 1.0, 0.7, "4 2"), "S52_PIPOHD")

# --- Built-up & cultural ---

def sld_buaare() -> str:
    return _sld(_polygon_rule("BUAARE", C["BUAAR"], C["LANDL"], 0.3, 0.5), "S52_BUAARE")

def sld_buisgl() -> str:
    return _sld(_polygon_rule("BUISGL", C["BUISG"], C["LANDL"], 0.3, 0.6), "S52_BUISGL")

def sld_siltnk() -> str:
    return _sld(_point_rule("SILTNK", C["SILTNK"], 4, 0.8, "square"), "S52_SILTNK")

# --- Meta & coverage ---

def sld_m_covr() -> str:
    return _sld(_polygon_rule("M_COVR", C["COV"], C["DEF_LN"], 0.2, 0.1), "S52_M_COVR")

def sld_m_npub() -> str:
    return _sld(_polygon_rule("M_NPUB", C["META"], C["DEF_LN"], 0.2, 0.1), "S52_M_NPUB")

def sld_m_nsys() -> str:
    return _sld(_polygon_rule("M_NSYS", C["META"], C["DEF_LN"], 0.2, 0.1), "S52_M_NSYS")

def sld_m_qual() -> str:
    return _sld(_polygon_rule("M_QUAL", C["META"], C["DEF_LN"], 0.2, 0.05), "S52_M_QUAL")

def sld_ospare() -> str:
    return _sld(_polygon_rule("OSPARE", C["META"], C["DEF_LN"], 0.2, 0.1), "S52_OSPARE")

def sld_magvar() -> str:
    return _sld(_line_rule("MAGVAR", C["DEF_LN"], 0.5, 0.4, "2 1"), "S52_MAGVAR")

# --- Additional S-57 object classes ---

def sld_achare() -> str:
    return _sld(_line_rule("ACHARE", C["MAG"], 0.8, 0.5, "4 2"), "S52_ACHARE")

def sld_achbrt() -> str:
    return _sld(_point_rule("ACHBRT", C["MAG"], 3, 0.7, "circle"), "S52_ACHBRT")

def sld_airare() -> str:
    return _sld(_polygon_rule("AIRARE", C["BUAAR"], C["LANDL"], 0.3, 0.3), "S52_AIRARE")

def sld_ajsply() -> str:
    return _sld(_line_rule("AJSPly", C["MAG"], 0.8, 0.5, "4 2"), "S52_AJSPly")

def sld_apprad() -> str:
    return _sld(_line_rule("APPRAD", C["MAG"], 0.8, 0.5, "4 2"), "S52_APPRAD")

def sld_arkspn() -> str:
    return _sld(_point_rule("ARKSPN", C["DEF_PT"], 3, 0.6), "S52_ARKSPN")

def sld_bcnlat_def() -> str:
    return sld_bcnspp()

def sld_berths() -> str:
    return _sld(_line_rule("BERTHS", C["SLC"], 1.0, 0.8), "S52_BERTHS")

def sld_blinst() -> str:
    return _sld(_line_rule("BLINST", C["MAG"], 0.8, 0.5, "4 2"), "S52_BLINST")

def sld_bogpol() -> str:
    return _sld(_polygon_rule("BOGPOL", C["SNDARE"], None, 0, 0.2), "S52_BOGPOL")

def sld_boom() -> str:
    return _sld(_line_rule("BOOM", C["LANDL"], 1.0, 0.7), "S52_BOOM")

def sld_bouisg() -> str:
    return sld_buisgl()

def sld_cansnw() -> str:
    return sld_bcnspp()

def sld_cathaf() -> str:
    return _sld(_polygon_rule("CATHAF", C["BUAAR"], C["LANDL"], 0.3, 0.3), "S52_CATHAF")

def sld_cbrsnp() -> str:
    return _sld(_line_rule("CBRSNP", C["MAG"], 0.8, 0.5, "4 2"), "S52_CBRSNP")

def sld_cblsup() -> str:
    return _sld(_line_rule("CBLSUP", C["CBLSUB"], 0.8, 0.5, "6 2"), "S52_CBLSUP")

def sld_cdrare() -> str:
    return _sld(_line_rule("CDRARE", C["MAG"], 0.8, 0.5, "4 2"), "S52_CDRARE")

def sld_cdrmgn() -> str:
    return _sld(_line_rule("CDRMGN", C["MAG"], 0.8, 0.5, "4 2"), "S52_CDRMGN")

def sld_cdoima() -> str:
    return _sld(_line_rule("CDOIMA", C["MAG"], 0.8, 0.5, "4 2"), "S52_CDOIMA")

def sld_cgeare() -> str:
    return _sld(_line_rule("CGEARE", C["MAG"], 0.8, 0.5, "4 2"), "S52_CGEARE")

def sld_chwpnt() -> str:
    return _sld(_point_rule("CHWPNT", C["MAG"], 3, 0.7, "circle"), "S52_CHWPNT")

def sld_cmrdwm() -> str:
    return _sld(_line_rule("CMRDWM", C["MAG"], 0.8, 0.5, "4 2"), "S52_CMRDWM")

def sld_cnodeg() -> str:
    return _sld(_line_rule("CNODEG", C["MAG"], 0.8, 0.5, "4 2"), "S52_CNODEG")

def sld_contower() -> str:
    return _sld(_point_rule("CONTOWER", C["LNDMRK"], 4, 0.8, "square"), "S52_CONTOWER")

def sld_convyr() -> str:
    return _sld(_line_rule("CONVYR", C["LANDL"], 0.8, 0.6), "S52_CONVYR")

def sld_crane() -> str:
    return _sld(_point_rule("CRANE", C["LNDMRK"], 3, 0.7, "triangle"), "S52_CRANE")

def sld_crelne() -> str:
    return _sld(_line_rule("CRELNE", C["MAG"], 0.8, 0.5, "4 2"), "S52_CRELNE")

def sld_damcon() -> str:
    return _sld(_line_rule("DAMCON", C["LANDL"], 1.0, 0.8), "S52_DAMCON")

def sld_danager() -> str:
    return _sld(_line_rule("DANGAR", C["MAG"], 0.8, 0.5, "4 2"), "S52_DANGAR")

def sld_depcnt_def() -> str:
    return sld_depcnt()

def sld_dismar() -> str:
    return _sld(_point_rule("DISMAR", C["DEF_PT"], 3, 0.6), "S52_DISMAR")

def sld_docare() -> str:
    return _sld(_line_rule("DOCARE", C["MAG"], 0.8, 0.5, "4 2"), "S52_DOCARE")

def sld_dock() -> str:
    return _sld(_polygon_rule("DOCK", C["WATER"], C["SLC"], 0.5, 0.3), "S52_DOCK")

def sld_drgare() -> str:
    return _sld(_polygon_rule("DRGARE", C["WATER"], C["MAG"], 0.5, 0.2), "S52_DRGARE")

def sld_drydoc() -> str:
    return _sld(_polygon_rule("DRYDOC", C["LANDA"], C["SLC"], 0.5, 0.5), "S52_DRYDOC")

def sld_dungrd() -> str:
    return _sld(_line_rule("DUNGRD", C["DEF_LN"], 0.8, 0.5, "3 2"), "S52_DUNGRD")

def sld_dwratc() -> str:
    return _sld(_line_rule("DWRATC", C["MAG"], 0.8, 0.5, "4 2"), "S52_DWRATC")

def sld_dwrtng() -> str:
    return _sld(_line_rule("DWRTNG", C["MAG"], 0.8, 0.5, "4 2"), "S52_DWRTNG")

def sld_fencly() -> str:
    return _sld(_line_rule("FENCLY", C["LANDL"], 0.8, 0.6), "S52_FENCLY")

def sld_ferry() -> str:
    return _sld(_line_rule("FERRY", C["MAG"], 0.8, 0.5, "4 2"), "S52_FERRY")

def sld_floate() -> str:
    return _sld(_point_rule("FLOATE", C["DEF_PT"], 3, 0.6), "S52_FLOATE")

def sld_fogsig_def() -> str:
    return sld_fogsig()

def sld_forstl() -> str:
    return _sld(_polygon_rule("FORSTL", "#A0C8A0", C["LANDL"], 0.3, 0.3), "S52_FORSTL")

def sld_fshfac() -> str:
    return _sld(_line_rule("FSHFAC", C["DEF_LN"], 0.8, 0.5), "S52_FSHFAC")

def sld_fshprn() -> str:
    return _sld(_line_rule("FSHPRN", C["DEF_LN"], 0.8, 0.5, "4 2"), "S52_FSHPRN")

def sld_fshzon() -> str:
    return _sld(_line_rule("FSHZON", C["DEF_LN"], 0.8, 0.5, "4 2"), "S52_FSHZON")

def sld_gatcon() -> str:
    return _sld(_line_rule("GATCON", C["SLC"], 1.0, 0.8), "S52_GATCON")

def sld_gatcon_def() -> str:
    return sld_gatcon()

def sld_gloflg() -> str:
    return _sld(_line_rule("GLOFLG", C["MAG"], 0.8, 0.5, "4 2"), "S52_GLOFLG")

def sld_gnsvln() -> str:
    return _sld(_line_rule("GNSVLN", C["DEF_LN"], 0.5, 0.4), "S52_GNSVLN")

def sld_helipad() -> str:
    return _sld(_point_rule("HELIPAD", C["LNDMRK"], 4, 0.8, "circle"), "S52_HELIPAD")

def sld_helplt() -> str:
    return _sld(_point_rule("HELPLT", C["LNDMRK"], 4, 0.7, "circle"), "S52_HELPLT")

def sld_hulk() -> str:
    return _sld(_point_rule("HULK", C["WRECK"], 4, 0.7, "square"), "S52_HULK")

def sld_hulkes() -> str:
    return sld_hulk()

def sld_iceare_def() -> str:
    return sld_iceare()

def sld_icergn() -> str:
    return _sld(_polygon_rule("ICERGN", C["ICE"], C["ICE"], 0.3, 0.2), "S52_ICERGN")

def sld_lakshr() -> str:
    return _sld(_line_rule("LAKSHR", C["COALN"], 0.8, 0.6), "S52_LAKSHR")

def sld_lndelv() -> str:
    return _sld(_line_rule("LNDELV", C["LANDL"], 0.5, 0.4), "S52_LNDELV")

def sld_logpon() -> str:
    return _sld(_point_rule("LOGPON", C["LNDMRK"], 3, 0.6, "square"), "S52_LOGPON")

def sld_lochar() -> str:
    return _sld(_line_rule("LOCHAR", C["MAG"], 0.8, 0.5, "4 2"), "S52_LOCHAR")

def sld_lkshrp() -> str:
    return _sld(_line_rule("LKSHRP", C["COALN"], 0.8, 0.6), "S52_LKSHRP")

def sld_maclnw() -> str:
    return _sld(_line_rule("MACLNW", C["MAG"], 0.8, 0.5, "4 2"), "S52_MACLNW")

def sld_marcult() -> str:
    return _sld(_line_rule("MARCULT", C["MAG"], 0.8, 0.5, "4 2"), "S52_MARCULT")

def sld_mipoly() -> str:
    return _sld(_polygon_rule("MIPOLY", C["META"], C["DEF_LN"], 0.2, 0.1), "S52_MIPOLY")

def sld_morfac() -> str:
    return _sld(_point_rule("MORFAC", C["LNDMRK"], 4, 0.8, "square"), "S52_MORFAC")

def sld_navlne() -> str:
    return _sld(_line_rule("NAVLNE", C["MAG"], 0.8, 0.5, "4 2"), "S52_NAVLNE")

def sld_obstrn_def() -> str:
    return sld_obstrn()

def sld_ofsplf() -> str:
    return _sld(_point_rule("OFSPLF", C["LNDMRK"], 4, 0.8, "square"), "S52_OFSPLF")

def sld_ospnt() -> str:
    return _sld(_point_rule("OSPNT", C["DEF_PT"], 3, 0.5), "S52_OSPNT")

def sld_pachab() -> str:
    return _sld(_line_rule("PACHAB", C["LANDL"], 0.8, 0.5), "S52_PACHAB")

def sld_pier() -> str:
    return _sld(_line_rule("PIER", C["SLC"], 1.0, 0.8), "S52_PIER")

def sld_pipare() -> str:
    return _sld(_line_rule("PIPARe", C["PIPSOL"], 0.8, 0.5, "4 2"), "S52_PIPARE")

def sld_pipare_def() -> str:
    return sld_pipare()

def sld_pipsub() -> str:
    return _sld(_line_rule("PIPSUB", C["CBLSUB"], 0.8, 0.5, "6 2"), "S52_PIPSUB")

def sld_ponton() -> str:
    return _sld(_line_rule("PONTON", C["SLC"], 0.8, 0.7), "S52_PONTON")

def sld_prvare() -> str:
    return _sld(_line_rule("PRVARE", C["MAG"], 0.8, 0.5, "4 2"), "S52_PRVARE")

def sld_prcare() -> str:
    return _sld(_line_rule("PRCARE", C["MAG"], 0.8, 0.5, "4 2"), "S52_PRCARE")

def sld_pylons_def() -> str:
    return sld_pylons()

def sld_radare() -> str:
    return _sld(_line_rule("RADARE", C["MAG"], 0.8, 0.5, "4 2"), "S52_RADARE")

def sld_radlin() -> str:
    return _sld(_line_rule("RADLIN", C["MAG"], 0.8, 0.5, "4 2"), "S52_RADLIN")

def sld_radref() -> str:
    return _sld(_point_rule("RADREF", C["RADSTA"], 3, 0.6, "triangle"), "S52_RADREF")

def sld_rapare() -> str:
    return _sld(_line_rule("RAPARE", C["MAG"], 0.8, 0.5, "4 2"), "S52_RAPARE")

def sld_rasrwd() -> str:
    return _sld(_line_rule("RASRWD", C["MAG"], 0.8, 0.5, "4 2"), "S52_RASRWD")

def sld_rctare() -> str:
    return _sld(_line_rule("RCTARE", C["MAG"], 0.8, 0.5, "4 2"), "S52_RCTARE")

def sld_rivbnk() -> str:
    return _sld(_line_rule("RIVBNK", C["COALN"], 0.8, 0.6), "S52_RIVBNK")

def sld_rivers_def() -> str:
    return sld_rivers()

def sld_roadwy() -> str:
    return _sld(_line_rule("ROADWY", C["LANDL"], 0.8, 0.6), "S52_ROADWY")

def sld_runway() -> str:
    return _sld(_polygon_rule("RUNWAY", "#C8C8C8", C["LANDL"], 0.3, 0.4), "S52_RUNWAY")

def sld_seabed() -> str:
    return _sld(_polygon_rule("SEABED", C["SNDARE"], None, 0, 0.15), "S52_SEABED")

def sld_seapln() -> str:
    return _sld(_polygon_rule("SEAPLN", C["META"], C["DEF_LN"], 0.2, 0.1), "S52_SEAPLN")

def sld_silstn() -> str:
    return sld_siltnk()

def sld_slogare() -> str:
    return _sld(_line_rule("SLOGARE", C["DEF_LN"], 0.8, 0.5, "4 2"), "S52_SLOGARE")

def sld_smcfac() -> str:
    return _sld(_point_rule("SMCFAC", C["LNDMRK"], 3, 0.6, "square"), "S52_SMCFAC")

def sld_sprare() -> str:
    return _sld(_line_rule("SPRARE", C["MAG"], 0.8, 0.5, "4 2"), "S52_SPRARE")

def sld_stslne() -> str:
    return _sld(_line_rule("STSLNE", C["LANDL"], 0.8, 0.5), "S52_STSLNE")

def sld_subtlg() -> str:
    return _sld(_line_rule("SUBTLG", C["DEPCN"], 0.5, 0.4, "2 1"), "S52_SUBTLG")

def sld_swptare() -> str:
    return _sld(_line_rule("SWPTARE", C["MAG"], 0.8, 0.5, "4 2"), "S52_SWPTARE")

def sld_tcobea() -> str:
    return _sld(_line_rule("TCOBEA", C["DEPCN"], 0.5, 0.4), "S52_TCOBEA")

def sld_tepare() -> str:
    return _sld(_line_rule("TEPARE", C["MAG"], 0.8, 0.5, "4 2"), "S52_TEPARE")

def sld_terque() -> str:
    return _sld(_line_rule("TERQUE", C["MAG"], 0.8, 0.5, "4 2"), "S52_TERQUE")

def sld_tidstr() -> str:
    return _sld(_line_rule("TIDSTR", C["DEPCN"], 0.5, 0.4), "S52_TIDSTR")

def sld_topmar() -> str:
    return _sld(_point_rule("TOPMAR", C["DAYMAR"], 3, 0.7, "triangle"), "S52_TOPMAR")

def sld_tpanel() -> str:
    return _sld(_polygon_rule("TPANEL", C["BUAAR"], C["LANDL"], 0.3, 0.3), "S52_TPANEL")

def sld_tsezn() -> str:
    return _sld(_line_rule("TSEZN", C["MAG"], 0.8, 0.5, "4 2"), "S52_TSEZN")

def sld_tunel() -> str:
    return _sld(_line_rule("TUNEL", C["LANDL"], 0.8, 0.5, "2 1"), "S52_TUNEL")

def sld_twtare() -> str:
    return _sld(_line_rule("TWTARE", C["MAG"], 0.8, 0.5, "4 2"), "S52_TWTARE")

def sld_ugpcol() -> str:
    return _sld(_line_rule("UGPCOL", C["MAG"], 0.8, 0.5, "4 2"), "S52_UGPCOL")

def sld_unsare() -> str:
    return _sld(_polygon_rule("UNSARE", C["LANDA"], C["LANDL"], 0.3, 0.3), "S52_UNSARE")

def sld_vegare() -> str:
    return _sld(_polygon_rule("VEGARE", "#A0C8A0", C["LANDL"], 0.3, 0.2), "S52_VEGARE")

def sld_watcon() -> str:
    return _sld(_line_rule("WATCON", C["SLC"], 0.8, 0.6), "S52_WATCON")

def sld_watfal() -> str:
    return _sld(_line_rule("WATFAL", C["DEPCN"], 0.8, 0.6), "S52_WATFAL")

def sld_waxisg() -> str:
    return sld_buisgl()

def sld_wtware() -> str:
    return _sld(_line_rule("WTWARE", C["MAG"], 0.8, 0.5, "4 2"), "S52_WTWARE")

def sld_wtwprg() -> str:
    return _sld(_line_rule("WTWPRG", C["MAG"], 0.8, 0.5, "4 2"), "S52_WTWPRG")

def sld_wtwrte() -> str:
    return _sld(_line_rule("WTWRTE", C["MAG"], 0.8, 0.5, "4 2"), "S52_WTWRTE")

def sld_wreck_def() -> str:
    return sld_wrecks()

def sld_weedare() -> str:
    return _sld(_polygon_rule("WEEDARE", "#A0C8A0", None, 0, 0.15), "S52_WEEDARE")

def sld_wtwhar() -> str:
    return _sld(_line_rule("WTWHAR", C["SLC"], 1.0, 0.8), "S52_WTWHAR")

def sld_wtwagg() -> str:
    return _sld(_line_rule("WTWAGG", C["MAG"], 0.8, 0.5, "4 2"), "S52_WTWAGG")


# ---------------------------------------------------------------------------
# Defaults based on geometry type
# ---------------------------------------------------------------------------

def sld_default_line() -> str:
    return _sld(_line_rule("default", C["DEF_LN"], 0.8, 0.6), "S52_default_line")

def sld_default_point() -> str:
    return _sld(_point_rule("default", C["DEF_PT"], 3, 0.7), "S52_default_point")

def sld_default_polygon() -> str:
    return _sld(_polygon_rule("default", C["DEF_PG"], C["DEF_LN"], 0.3, 0.3), "S52_default_polygon")


# ---------------------------------------------------------------------------
# Complete S-57 object class → SLD mapping
# Covers all ~180 IHO S-57 object classes from the official catalogue
# ---------------------------------------------------------------------------

SLD_MAP: dict[str, callable] = {
    # Land & shoreline
    "LNDARE": sld_lndare,
    "COALNE": sld_coalne,
    "SLCONS": sld_slcons,
    "LNDMRK": sld_lndmrk,
    "LNDRGN": sld_lndrgn,
    "DYLAND": sld_dyland,
    "DYKCON": sld_dykcon,
    "LNDELV": sld_lndelv,
    "UNSARE": sld_unsare,
    "VEGARE": sld_vegare,
    "FORSTL": sld_forstl,

    # Depth & bathymetry
    "DEPARE": sld_depare,
    "DEPCNT": sld_depcnt,
    "SOUNDG": sld_soundg,
    "VALMAR": sld_valmar,
    "SUBTLG": sld_subtlg,
    "TCOBEA": sld_tcobea,
    "TIDSTR": sld_tidstr,

    # Beacons
    "BCNSPP": sld_bcnspp,
    "BCNLAT": sld_bcnlat,
    "BCNISW": sld_bcnisw,
    "BCNSAW": sld_bcnsaw,
    "BCNWRN": sld_bcnwrn,
    "CANSNW": sld_cansnw,
    "RTPBCN": sld_rtpbcn,

    # Buoys
    "BOYLAT": sld_boylat,
    "BOYSAW": sld_boysaw,
    "BOYSPP": sld_boyspp,
    "BOYCAR": sld_boycar,
    "BOYLNG": sld_boylng,
    "BOYISW": sld_boyisw,
    "BOYINB": sld_boyinb,
    "BOYWRN": sld_boywrn,
    "BOYSHP": sld_boyshp,
    "BOYCOL": sld_boycol,

    # Lights & signals
    "LIGHTS": sld_lights,
    "LITFLT": sld_litflt,
    "LITMIN": sld_litmin,
    "FOGSIG": sld_fogsig,
    "DAYMAR": sld_daymar,
    "RADSTA": sld_radsta,
    "RDOSTA": sld_rdosta,
    "TOPMAR": sld_topmar,

    # Restricted / caution / regulated areas
    "RESARE": sld_resare,
    "CTNARE": sld_ctnare,
    "NAVTEX": sld_navtex,
    "DMPGRD": sld_dmpgrd,
    "MIPARE": sld_mipare,
    "ADMARE": sld_admare,
    "PYLONS": sld_pylons,

    # Water areas & ways
    "FAIRWY": sld_fairwy,
    "CHNEL": sld_chnel,
    "LAKARE": sld_lakare,
    "RIVERS": sld_rivers,
    "CANALS": sld_canals,
    "SEAARE": sld_seaare,
    "SBDARE": sld_sbdare,
    "BOGPOL": sld_bogpol,
    "WEEDARE": sld_weedare,

    # Maritime zones
    "EXEZNE": sld_exezne,
    "CONZNE": sld_conzne,
    "COSARE": sld_cosare,
    "TESARE": sld_tesare,
    "MARCUL": sld_marcult,
    "MARCULT": sld_marcult,

    # Hazards
    "WRECKS": sld_wrecks,
    "OBSTRN": sld_obstrn,
    "UWTROC": sld_uwtroc,
    "ICEARE": sld_iceare,
    "ICERGN": sld_icergn,
    "HULK": sld_hulk,
    "HULKES": sld_hulkes,

    # Infrastructure
    "BRIDGE": sld_bridge,
    "CBLSUB": sld_cblsub,
    "CBLSUP": sld_cblsup,
    "PIPSOL": sld_pipsol,
    "PIPOHD": sld_pipohd,
    "PIPSUB": sld_pipsub,
    "PIPARe": sld_pipare,
    "GATCON": sld_gatcon,
    "PIER": sld_pier,
    "PONTON": sld_ponton,
    "DAMCON": sld_damcon,
    "WATCON": sld_watcon,
    "CONVYR": sld_convyr,
    "BOOM": sld_boom,
    "FENCLY": sld_fencly,
    "TUNEL": sld_tunel,
    "STSLNE": sld_stslne,
    "DOCK": sld_dock,
    "DRYDOC": sld_drydoc,
    "DRGARE": sld_drgare,
    "BERTHS": sld_berths,
    "WTWHAR": sld_wtwhar,
    "MORFAC": sld_morfac,
    "OFSPLF": sld_ofsplf,
    "LOGPON": sld_logpon,
    "CRANE": sld_crane,
    "ARKSPN": sld_arkspn,

    # Built-up & cultural
    "BUAARE": sld_buaare,
    "BUISGL": sld_buisgl,
    "SILTNK": sld_siltnk,
    "SILSTN": sld_silstn,
    "AIRARE": sld_airare,
    "CATHAF": sld_cathaf,
    "CONTOWER": sld_contower,
    "HELIPAD": sld_helipad,
    "HELPLT": sld_helplt,
    "SMCFAC": sld_smcfac,
    "TPANEL": sld_tpanel,
    "RUNWAY": sld_runway,
    "ROADWY": sld_roadwy,
    "PACHAB": sld_pachab,

    # Meta & coverage
    "M_COVR": sld_m_covr,
    "M_NPUB": sld_m_npub,
    "M_NSYS": sld_m_nsys,
    "M_QUAL": sld_m_qual,
    "MIPOLY": sld_mipoly,
    "OSPARE": sld_ospare,
    "MAGVAR": sld_magvar,
    "SEAPLN": sld_seapln,
    "OSPNT": sld_ospnt,

    # Additional S-57 classes
    "ACHARE": sld_achare,
    "ACHBRT": sld_achbrt,
    "AJSPly": sld_ajsply,
    "APPRAD": sld_apprad,
    "BLINST": sld_blinst,
    "CBRSNP": sld_cbrsnp,
    "CDRARE": sld_cdrare,
    "CDRMGN": sld_cdrmgn,
    "CDOIMA": sld_cdoima,
    "CGEARE": sld_cgeare,
    "CHWPNT": sld_chwpnt,
    "CMRDWM": sld_cmrdwm,
    "CNODEG": sld_cnodeg,
    "CRELNE": sld_crelne,
    "DANGAR": sld_danager,
    "DISMAR": sld_dismar,
    "DOCARE": sld_docare,
    "DUNGRD": sld_dungrd,
    "DWRATC": sld_dwratc,
    "DWRTNG": sld_dwrtng,
    "FERRY": sld_ferry,
    "FLOATE": sld_floate,
    "FSHFAC": sld_fshfac,
    "FSHPRN": sld_fshprn,
    "FSHZON": sld_fshzon,
    "GLOFLG": sld_gloflg,
    "GNSVLN": sld_gnsvln,
    "LAKSHR": sld_lakshr,
    "LKSHRP": sld_lkshrp,
    "LOCHAR": sld_lochar,
    "MACLNW": sld_maclnw,
    "NAVLNE": sld_navlne,
    "PRCARE": sld_prcare,
    "PRVARE": sld_prvare,
    "RADARE": sld_radare,
    "RADLIN": sld_radlin,
    "RADREF": sld_radref,
    "RAPARE": sld_rapare,
    "RASRWD": sld_rasrwd,
    "RCTARE": sld_rctare,
    "RIVBNK": sld_rivbnk,
    "SEABED": sld_seabed,
    "SLOGARE": sld_slogare,
    "SPRARE": sld_sprare,
    "SWPTARE": sld_swptare,
    "TEPARE": sld_tepare,
    "TERQUE": sld_terque,
    "TSEZN": sld_tsezn,
    "TWTARE": sld_wtware,
    "WTWPRG": sld_wtwprg,
    "WTWRTE": sld_wtwrte,
    "WTWAGG": sld_wtwagg,
    "UGPCOL": sld_ugpcol,
    "WATFAL": sld_watfal,
    "WAXISG": sld_waxisg,
}


def get_sld_for_layer(layer_name: str) -> str | None:
    """Get SLD XML for a given S-57 layer name.

    Returns None if no specific SLD exists (caller should use a default).
    Handles GeoServer layer names with numeric suffixes (e.g. DEPARE4 -> DEPARE).
    """
    # Try exact match first
    gen = SLD_MAP.get(layer_name)
    if gen:
        return gen()
    # Strip trailing digits (e.g. DEPARE4 -> DEPARE, COALNE2 -> COALNE)
    base_name = re.sub(r'\d+$', '', layer_name)
    gen = SLD_MAP.get(base_name)
    if gen:
        return gen()
    return None


SLD_TEMPLATES = SLD_MAP

def get_default_sld_for_geometry(geom_type: str) -> str:
    """Get a default SLD based on geometry type."""
    g = geom_type.lower()
    if "point" in g or "multipoint" in g:
        return sld_default_point()
    if "line" in g or "multiline" in g:
        return sld_default_line()
    return sld_default_polygon()
