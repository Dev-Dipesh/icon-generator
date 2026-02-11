import { memo, useCallback, useMemo, useState } from "react";
import * as Lucide from "lucide-react";
import "./App.css";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "./components/ui/collapsible";

const DEFAULT_SIZES = [16, 32, 48, 128];
const EXTRA_SIZES = [256, 512, 1024];
const CANVAS_SIZE = 256;

const ALL_ICON_NAMES = Object.keys(Lucide)
  .filter((key) => {
    if (!/^[A-Z]/.test(key)) return false;
    if (key === "Icon") return false;
    return true;
  })
  .sort((a, b) => a.localeCompare(b));

const hexRegex = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

function toColorInputValue(value, fallback = "#000000") {
  return hexRegex.test(value) ? value : fallback;
}

function resolveIcon(name) {
  return name ? Lucide[name] : null;
}

function buildIconSvg(iconName, strokeColor, strokeWidth) {
  const icon = resolveIcon(iconName);
  if (!icon) return null;

  const element =
    typeof icon === "function"
      ? icon({ color: strokeColor, size: 24, strokeWidth })
      : icon.render({ color: strokeColor, size: 24, strokeWidth });

  let nodes = [];
  if (element?.props?.iconNode) {
    nodes = element.props.iconNode.map(([tag, attrs]) => ({ type: tag, props: attrs }));
  } else if (element?.props?.children) {
    nodes = Array.isArray(element.props.children)
      ? element.props.children
      : [element.props.children];
  }

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("width", "24");
  svg.setAttribute("height", "24");
  svg.setAttribute("stroke", strokeColor);
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke-width", strokeWidth);
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");

  nodes.forEach((node) => {
    if (!node) return;
    const el = document.createElementNS("http://www.w3.org/2000/svg", node.type);
    Object.entries(node.props || {}).forEach(([key, value]) => {
      if (key === "children" || key === "ref") return;
      el.setAttribute(key, value);
    });
    svg.appendChild(el);
  });

  return new XMLSerializer().serializeToString(svg);
}

function buildCompositeSvg({
  size,
  iconName,
  bgColor,
  strokeColor,
  strokeWidth,
  shape,
  padding,
  baseScale,
  basePosX,
  basePosY,
  overlay,
}) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  svg.setAttribute("width", size);
  svg.setAttribute("height", size);
  svg.setAttribute("viewBox", `0 0 ${size} ${size}`);

  const bg = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  bg.setAttribute("x", "0");
  bg.setAttribute("y", "0");
  bg.setAttribute("width", size);
  bg.setAttribute("height", size);
  bg.setAttribute("fill", bgColor);
  if (shape === "circle") {
    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("cx", size / 2);
    circle.setAttribute("cy", size / 2);
    circle.setAttribute("r", size / 2);
    circle.setAttribute("fill", bgColor);
    svg.appendChild(circle);
  } else {
    if (shape === "rounded") {
      bg.setAttribute("rx", size * 0.22);
      bg.setAttribute("ry", size * 0.22);
    }
    svg.appendChild(bg);
  }

  const primarySize = (size - padding * 2) * (baseScale || 1);
  const iconSize = Math.max(4, Math.round(primarySize));
  const iconCenterX = Math.round(size * (basePosX / 100));
  const iconCenterY = Math.round(size * (basePosY / 100));
  const iconX = Math.round(iconCenterX - iconSize / 2);
  const iconY = Math.round(iconCenterY - iconSize / 2);

  const icon = resolveIcon(iconName);
  if (icon) {
    const element =
      typeof icon === "function"
        ? icon({ color: strokeColor, size: 24, strokeWidth })
        : icon.render({ color: strokeColor, size: 24, strokeWidth });
    let nodes = [];
    if (element?.props?.iconNode) {
      nodes = element.props.iconNode.map(([tag, attrs]) => ({ type: tag, props: attrs }));
    } else if (element?.props?.children) {
      nodes = Array.isArray(element.props.children)
        ? element.props.children
        : [element.props.children];
    }
    const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
    const scale = iconSize / 24;
    group.setAttribute("transform", `translate(${iconX}, ${iconY}) scale(${scale})`);
    group.setAttribute("stroke", strokeColor);
    group.setAttribute("fill", "none");
    group.setAttribute("stroke-width", strokeWidth);
    group.setAttribute("stroke-linecap", "round");
    group.setAttribute("stroke-linejoin", "round");
    nodes.forEach((node) => {
      if (!node) return;
      const el = document.createElementNS("http://www.w3.org/2000/svg", node.type);
      Object.entries(node.props || {}).forEach(([key, value]) => {
        if (key === "children" || key === "ref") return;
        el.setAttribute(key, value);
      });
      group.appendChild(el);
    });
    svg.appendChild(group);
  }

  if (overlay && overlay.iconName) {
    const overlaySize = Math.round(size * overlay.scale);
    const overlayCenterX = Math.round(size * (overlay.posX / 100));
    const overlayCenterY = Math.round(size * (overlay.posY / 100));
    const overlayX = Math.round(overlayCenterX - overlaySize / 2);
    const overlayY = Math.round(overlayCenterY - overlaySize / 2);

    if (overlay.bgColor && overlay.bgAlpha > 0) {
      const bgShape =
        overlay.shape === "circle"
          ? document.createElementNS("http://www.w3.org/2000/svg", "circle")
          : document.createElementNS("http://www.w3.org/2000/svg", "rect");
      if (overlay.shape === "circle") {
        bgShape.setAttribute("cx", overlayX + overlaySize / 2);
        bgShape.setAttribute("cy", overlayY + overlaySize / 2);
        bgShape.setAttribute("r", overlaySize / 2);
      } else {
        bgShape.setAttribute("x", overlayX);
        bgShape.setAttribute("y", overlayY);
        bgShape.setAttribute("width", overlaySize);
        bgShape.setAttribute("height", overlaySize);
        if (overlay.shape === "rounded") {
          const radius = Math.round(overlaySize * overlay.radius);
          bgShape.setAttribute("rx", radius);
          bgShape.setAttribute("ry", radius);
        }
      }
      bgShape.setAttribute("fill", overlay.bgColor);
      bgShape.setAttribute("opacity", overlay.bgAlpha);
      svg.appendChild(bgShape);
    }

    const overlayIcon = resolveIcon(overlay.iconName);
    if (overlayIcon) {
      const element =
        typeof overlayIcon === "function"
          ? overlayIcon({ color: overlay.strokeColor, size: 24, strokeWidth: overlay.strokeWidth })
          : overlayIcon.render({ color: overlay.strokeColor, size: 24, strokeWidth: overlay.strokeWidth });
      let nodes = [];
      if (element?.props?.iconNode) {
        nodes = element.props.iconNode.map(([tag, attrs]) => ({ type: tag, props: attrs }));
      } else if (element?.props?.children) {
        nodes = Array.isArray(element.props.children)
          ? element.props.children
          : [element.props.children];
      }
      const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
      const innerPadding = Math.round(overlaySize * overlay.innerPadding);
      const iconSize = overlaySize - innerPadding * 2;
      const scale = iconSize / 24;
      group.setAttribute(
        "transform",
        `translate(${overlayX + innerPadding}, ${overlayY + innerPadding}) scale(${scale})`
      );
      group.setAttribute("stroke", overlay.strokeColor);
      group.setAttribute("fill", "none");
      group.setAttribute("stroke-width", overlay.strokeWidth);
      group.setAttribute("stroke-linecap", "round");
      group.setAttribute("stroke-linejoin", "round");
      nodes.forEach((node) => {
        if (!node) return;
        const el = document.createElementNS("http://www.w3.org/2000/svg", node.type);
        Object.entries(node.props || {}).forEach(([key, value]) => {
          if (key === "children" || key === "ref") return;
          el.setAttribute(key, value);
        });
        group.appendChild(el);
      });
      svg.appendChild(group);
    }
  }

  return new XMLSerializer().serializeToString(svg);
}

function drawRoundedRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

async function drawIconToCanvas({
  size,
  iconName,
  bgColor,
  strokeColor,
  strokeWidth,
  shape,
  padding,
  baseScale,
  basePosX,
  basePosY,
  overlay,
}) {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");

  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = bgColor;

  if (shape === "circle") {
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    ctx.fill();
  } else if (shape === "rounded") {
    drawRoundedRect(ctx, 0, 0, size, size, Math.round(size * 0.22));
    ctx.fill();
  } else {
    ctx.fillRect(0, 0, size, size);
  }

  const baseSize = (size - padding * 2) * (baseScale || 1);
  const iconSize = Math.max(4, Math.round(baseSize));
  const iconCenterX = Math.round(size * (basePosX / 100));
  const iconCenterY = Math.round(size * (basePosY / 100));
  const iconX = Math.round(iconCenterX - iconSize / 2);
  const iconY = Math.round(iconCenterY - iconSize / 2);
  const svgMarkup = buildIconSvg(iconName, strokeColor, strokeWidth);

  if (svgMarkup) {
    const img = new Image();
    const encoded = `data:image/svg+xml;base64,${btoa(svgMarkup)}`;
    await new Promise((resolve) => {
      img.onload = () => {
        ctx.drawImage(img, iconX, iconY, iconSize, iconSize);
        resolve();
      };
      img.src = encoded;
    });
  }

  if (overlay && overlay.iconName) {
    const overlaySize = Math.round(size * overlay.scale);
    const overlayCenterX = Math.round(size * (overlay.posX / 100));
    const overlayCenterY = Math.round(size * (overlay.posY / 100));
    const overlayX = Math.round(overlayCenterX - overlaySize / 2);
    const overlayY = Math.round(overlayCenterY - overlaySize / 2);

    if (overlay.bgColor && overlay.bgAlpha > 0) {
      ctx.save();
      ctx.globalAlpha = overlay.bgAlpha;
      ctx.fillStyle = overlay.bgColor;
      if (overlay.shape === "circle") {
        ctx.beginPath();
        ctx.arc(
          overlayX + overlaySize / 2,
          overlayY + overlaySize / 2,
          overlaySize / 2,
          0,
          Math.PI * 2
        );
        ctx.fill();
      } else if (overlay.shape === "rounded") {
        drawRoundedRect(
          ctx,
          overlayX,
          overlayY,
          overlaySize,
          overlaySize,
          Math.round(overlaySize * overlay.radius)
        );
        ctx.fill();
      } else {
        ctx.fillRect(overlayX, overlayY, overlaySize, overlaySize);
      }
      ctx.restore();
    }

    const overlaySvg = buildIconSvg(
      overlay.iconName,
      overlay.strokeColor,
      overlay.strokeWidth
    );
    if (overlaySvg) {
      const img = new Image();
      const encoded = `data:image/svg+xml;base64,${btoa(overlaySvg)}`;
      const innerPadding = Math.round(overlaySize * overlay.innerPadding);
      await new Promise((resolve) => {
        img.onload = () => {
          ctx.drawImage(
            img,
            overlayX + innerPadding,
            overlayY + innerPadding,
            overlaySize - innerPadding * 2,
            overlaySize - innerPadding * 2
          );
          resolve();
        };
        img.src = encoded;
      });
    }
  }

  return canvas;
}

function downloadCanvas(canvas, filename) {
  canvas.toBlob((blob) => {
    if (!blob) return;
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
  });
}

const SelectedIcons = memo(function SelectedIcons({
  primaryIcon,
  secondaryIcon,
  onClearPrimary,
  onClearSecondary,
}) {
  const PrimaryIconComponent = resolveIcon(primaryIcon);
  const SecondaryIconComponent = resolveIcon(secondaryIcon);

  return (
    <div className="selected-icons">
      <div className="selected-card">
        <div className="selected-title">Primary</div>
        {PrimaryIconComponent ? (
          <PrimaryIconComponent size={28} stroke="currentColor" strokeWidth={1.8} />
        ) : (
          <span className="selected-empty">Not set</span>
        )}
        <div className="selected-row">
          <div className="selected-name">{primaryIcon || "None"}</div>
          <button
            className="selected-clear"
            onClick={onClearPrimary}
            disabled={!primaryIcon}
            type="button"
          >
            Clear
          </button>
        </div>
      </div>
      <div className="selected-card">
        <div className="selected-title">Secondary</div>
        {SecondaryIconComponent ? (
          <SecondaryIconComponent size={28} stroke="currentColor" strokeWidth={1.8} />
        ) : (
          <span className="selected-empty">Not set</span>
        )}
        <div className="selected-row">
          <div className="selected-name">{secondaryIcon || "None"}</div>
          <button
            className="selected-clear"
            onClick={onClearSecondary}
            disabled={!secondaryIcon}
            type="button"
          >
            Clear
          </button>
        </div>
      </div>
    </div>
  );
});

const IconCard = memo(function IconCard({ name, selected, onSelect }) {
  const Icon = resolveIcon(name);
  return (
    <button
      type="button"
      className={`icon-card ${selected ? "selected" : ""}`}
      onClick={() => onSelect(name)}
    >
      {Icon ? <Icon size={28} stroke="currentColor" strokeWidth={1.6} /> : null}
      <span>{name}</span>
    </button>
  );
});

const IconGrid = memo(function IconGrid({ icons, selected, onSelect }) {
  return (
    <div className="grid">
      {icons.map((name) => (
        <IconCard
          key={name}
          name={name}
          selected={selected.includes(name)}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
});

export default function App() {
  const [search, setSearch] = useState("");
  const [primaryIcon, setPrimaryIcon] = useState("");
  const [secondaryIcon, setSecondaryIcon] = useState("");

  const [bgColorText, setBgColorText] = useState("#262626");
  const [shape, setShape] = useState("rounded");
  const [padding, setPadding] = useState(28);
  const [baseScale, setBaseScale] = useState(1);
  const [basePosX, setBasePosX] = useState(50);
  const [basePosY, setBasePosY] = useState(50);

  const [primaryStrokeText, setPrimaryStrokeText] = useState("#fafafa");
  const [primaryStrokeWidth, setPrimaryStrokeWidth] = useState(1.7);

  const [secondaryStrokeText, setSecondaryStrokeText] = useState("#fafafa");
  const [secondaryStrokeWidth, setSecondaryStrokeWidth] = useState(1.7);

  const [overlayBgText, setOverlayBgText] = useState("#000000");
  const [overlayBgAlpha, setOverlayBgAlpha] = useState(0.2);
  const [overlayShape, setOverlayShape] = useState("rounded");
  const [overlayRadius, setOverlayRadius] = useState(0.3);
  const [overlayScale, setOverlayScale] = useState(0.34);
  const [overlayPadding, setOverlayPadding] = useState(0.18);
  const [overlayPosX, setOverlayPosX] = useState(75);
  const [overlayPosY, setOverlayPosY] = useState(25);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [extraSizes, setExtraSizes] = useState(EXTRA_SIZES.reduce((acc, size) => {
    acc[size] = false;
    return acc;
  }, {}));
  const [primaryOpen, setPrimaryOpen] = useState(true);
  const [secondaryOpen, setSecondaryOpen] = useState(true);

  const filteredIcons = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return ALL_ICON_NAMES;
    return ALL_ICON_NAMES.filter((name) => name.toLowerCase().includes(query));
  }, [search]);

  const selectedList = useMemo(() => {
    return [primaryIcon, secondaryIcon].filter(Boolean);
  }, [primaryIcon, secondaryIcon]);

  const handleSelectIcon = useCallback(
    (name) => {
      if (name === primaryIcon) {
        setPrimaryIcon("");
        return;
      }
      if (name === secondaryIcon) {
        setSecondaryIcon("");
        return;
      }
      if (!primaryIcon) {
        setPrimaryIcon(name);
        return;
      }
      if (!secondaryIcon) {
        setSecondaryIcon(name);
        return;
      }
      setSecondaryIcon(name);
    },
    [primaryIcon, secondaryIcon]
  );

  const handleDownload = async () => {
    const selectedSizes = [
      ...DEFAULT_SIZES,
      ...EXTRA_SIZES.filter((size) => extraSizes[size]),
    ];
    for (const size of selectedSizes) {
      const canvas = await drawIconToCanvas({
        size,
        iconName: primaryIcon,
        bgColor: bgColorText,
        strokeColor: primaryStrokeText,
        strokeWidth: primaryStrokeWidth,
        shape,
        padding: Math.max(4, Math.round((padding / CANVAS_SIZE) * size)),
        baseScale,
        basePosX,
        basePosY,
        overlay: secondaryIcon
          ? {
              iconName: secondaryIcon,
              strokeColor: secondaryStrokeText,
              strokeWidth: secondaryStrokeWidth,
              bgColor: overlayBgText,
              bgAlpha: overlayBgAlpha,
              shape: overlayShape,
              radius: overlayRadius,
              scale: overlayScale,
              innerPadding: overlayPadding,
              posX: overlayPosX,
              posY: overlayPosY,
            }
          : null,
      });
      downloadCanvas(canvas, `icon-${size}.png`);
    }
  };

  const handleDownloadSvg = () => {
    const svg = buildCompositeSvg({
      size: CANVAS_SIZE,
      iconName: primaryIcon,
      bgColor: bgColorText,
      strokeColor: primaryStrokeText,
      strokeWidth: primaryStrokeWidth,
      shape,
      padding,
      baseScale,
      basePosX,
      basePosY,
      overlay: secondaryIcon
        ? {
            iconName: secondaryIcon,
            strokeColor: secondaryStrokeText,
            strokeWidth: secondaryStrokeWidth,
            bgColor: overlayBgText,
            bgAlpha: overlayBgAlpha,
            shape: overlayShape,
            radius: overlayRadius,
            scale: overlayScale,
            innerPadding: overlayPadding,
            posX: overlayPosX,
            posY: overlayPosY,
          }
        : null,
    });
    const blob = new Blob([svg], { type: "image/svg+xml" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "icon.svg";
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const PrimaryIconComponent = resolveIcon(primaryIcon);
  const SecondaryIconComponent = resolveIcon(secondaryIcon);

  return (
    <div className="app">
      <header className="header">
        <div>
          <h1>Extension Icon Generator</h1>
          <p>Select up to two Lucide icons and export extension sizes.</p>
        </div>
        <button className="btn ghost" onClick={() => setSidebarOpen((prev) => !prev)}>
          {sidebarOpen ? "Hide" : "Show"} Sidebar
        </button>
      </header>

      <div className={`layout ${sidebarOpen ? "" : "sidebar-collapsed"}`}>
        <section className="panel">
          <div className="panel-header">
            <h2>Controls</h2>
          </div>
          <Collapsible
            open={primaryOpen}
            onOpenChange={setPrimaryOpen}
            className="section"
          >
            <CollapsibleTrigger>
              <span>Primary icon</span>
              <Lucide.ChevronDown
                size={18}
                className={primaryOpen ? "rotate-180 transition" : "transition"}
              />
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="section-body">
          <div className="field">
            <label>Background</label>
            <div className="row">
              <input
                type="color"
                value={toColorInputValue(bgColorText, "#262626")}
                onChange={(e) => setBgColorText(e.target.value)}
              />
              <input
                type="text"
                value={bgColorText}
                onChange={(e) => setBgColorText(e.target.value)}
                placeholder="#262626 or rgba(0,0,0,0.8)"
              />
            </div>
          </div>
          <div className="field">
            <label>Primary stroke</label>
            <div className="row">
              <input
                type="color"
                value={toColorInputValue(primaryStrokeText, "#fafafa")}
                onChange={(e) => setPrimaryStrokeText(e.target.value)}
              />
              <input
                type="text"
                value={primaryStrokeText}
                onChange={(e) => setPrimaryStrokeText(e.target.value)}
                placeholder="#fafafa or rgba(255,255,255,1)"
              />
            </div>
          </div>
          <div className="field">
            <label>Primary stroke width</label>
            <input
              type="range"
              min="1"
              max="3.5"
              step="0.1"
              value={primaryStrokeWidth}
              onChange={(e) => setPrimaryStrokeWidth(Number(e.target.value))}
            />
            <span className="value">{primaryStrokeWidth.toFixed(1)}</span>
          </div>
          <div className="field">
            <label>Shape</label>
            <select value={shape} onChange={(e) => setShape(e.target.value)}>
              <option value="rounded">Rounded square</option>
              <option value="square">Square</option>
              <option value="circle">Circle</option>
            </select>
          </div>
          <div className="field">
            <label>Padding</label>
            <input
              type="range"
              min="12"
              max="44"
              step="2"
              value={padding}
              onChange={(e) => setPadding(Number(e.target.value))}
            />
            <span className="value">{padding}px</span>
          </div>
          <div className="field">
            <label>Primary size</label>
            <input
              type="range"
              min="0.6"
              max="1.2"
              step="0.05"
              value={baseScale}
              onChange={(e) => setBaseScale(Number(e.target.value))}
            />
            <span className="value">{Math.round(baseScale * 100)}%</span>
          </div>
          <div className="field">
            <label>Primary position X</label>
            <input
              type="range"
              min="0"
              max="100"
              step="1"
              value={basePosX}
              onChange={(e) => setBasePosX(Number(e.target.value))}
            />
            <span className="value">{basePosX}%</span>
          </div>
          <div className="field">
            <label>Primary position Y</label>
            <input
              type="range"
              min="0"
              max="100"
              step="1"
              value={basePosY}
              onChange={(e) => setBasePosY(Number(e.target.value))}
            />
            <span className="value">{basePosY}%</span>
          </div>
              </div>
            </CollapsibleContent>
          </Collapsible>

          <Collapsible
            open={secondaryOpen}
            onOpenChange={setSecondaryOpen}
            className="section"
          >
            <CollapsibleTrigger>
              <span>Secondary icon</span>
              <Lucide.ChevronDown
                size={18}
                className={secondaryOpen ? "rotate-180 transition" : "transition"}
              />
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="section-body">
          <div className="field">
            <label>Secondary stroke</label>
            <div className="row">
              <input
                type="color"
                value={toColorInputValue(secondaryStrokeText, "#fafafa")}
                onChange={(e) => setSecondaryStrokeText(e.target.value)}
              />
              <input
                type="text"
                value={secondaryStrokeText}
                onChange={(e) => setSecondaryStrokeText(e.target.value)}
                placeholder="#fafafa or rgba(255,255,255,1)"
              />
            </div>
          </div>
          <div className="field">
            <label>Secondary stroke width</label>
            <input
              type="range"
              min="1"
              max="3.5"
              step="0.1"
              value={secondaryStrokeWidth}
              onChange={(e) => setSecondaryStrokeWidth(Number(e.target.value))}
            />
            <span className="value">{secondaryStrokeWidth.toFixed(1)}</span>
          </div>
          <div className="field">
            <label>Secondary background</label>
            <div className="row">
              <input
                type="color"
                value={toColorInputValue(overlayBgText, "#000000")}
                onChange={(e) => setOverlayBgText(e.target.value)}
              />
              <input
                type="text"
                value={overlayBgText}
                onChange={(e) => setOverlayBgText(e.target.value)}
                placeholder="#000000 or rgba(0,0,0,0.4)"
              />
            </div>
          </div>
          <div className="field">
            <label>Secondary background opacity</label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={overlayBgAlpha}
              onChange={(e) => setOverlayBgAlpha(Number(e.target.value))}
            />
            <span className="value">{Math.round(overlayBgAlpha * 100)}%</span>
          </div>
          <div className="field">
            <label>Secondary background shape</label>
            <select
              value={overlayShape}
              onChange={(e) => setOverlayShape(e.target.value)}
            >
              <option value="rounded">Rounded square</option>
              <option value="square">Square</option>
              <option value="circle">Circle</option>
            </select>
          </div>
          <div className="field">
            <label>Secondary rounded radius</label>
            <input
              type="range"
              min="0.05"
              max="0.5"
              step="0.05"
              value={overlayRadius}
              onChange={(e) => setOverlayRadius(Number(e.target.value))}
            />
            <span className="value">{overlayRadius.toFixed(2)}</span>
          </div>
          <div className="field">
            <label>Secondary size</label>
            <input
              type="range"
              min="0.2"
              max="0.5"
              step="0.02"
              value={overlayScale}
              onChange={(e) => setOverlayScale(Number(e.target.value))}
            />
            <span className="value">{Math.round(overlayScale * 100)}%</span>
          </div>
          <div className="field">
            <label>Secondary inner padding</label>
            <input
              type="range"
              min="0.08"
              max="0.3"
              step="0.02"
              value={overlayPadding}
              onChange={(e) => setOverlayPadding(Number(e.target.value))}
            />
            <span className="value">{Math.round(overlayPadding * 100)}%</span>
          </div>
          <div className="field">
            <label>Secondary position X</label>
            <input
              type="range"
              min="0"
              max="100"
              step="1"
              value={overlayPosX}
              onChange={(e) => setOverlayPosX(Number(e.target.value))}
            />
            <span className="value">{overlayPosX}%</span>
          </div>
          <div className="field">
            <label>Secondary position Y</label>
            <input
              type="range"
              min="0"
              max="100"
              step="1"
              value={overlayPosY}
              onChange={(e) => setOverlayPosY(Number(e.target.value))}
            />
            <span className="value">{overlayPosY}%</span>
          </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </section>

        <div className="preview-column">
          <section className="preview">
            <div className="preview-header">
              <h2>Preview</h2>
              <div className="preview-actions">
                <button className="btn" onClick={handleDownloadSvg} type="button">
                  Download SVG
                </button>
                <button className="btn primary" onClick={handleDownload} type="button">
                  Download PNGs
                </button>
              </div>
            </div>
            <div className="preview-card">
              <div className={`icon-preview ${shape}`} style={{ background: bgColorText }}>
                {PrimaryIconComponent ? (
                  <span
                    className="primary-layer"
                    style={{
                      left: `${basePosX}%`,
                      top: `${basePosY}%`,
                      transform: "translate(-50%, -50%)",
                    }}
                  >
                    <PrimaryIconComponent
                      size={(CANVAS_SIZE - padding * 2) * baseScale}
                      stroke={primaryStrokeText}
                      strokeWidth={primaryStrokeWidth}
                    />
                  </span>
                ) : (
                  <div className="empty">Select an icon</div>
                )}
                {SecondaryIconComponent ? (
                  <span
                    className={`overlay ${overlayShape}`}
                    style={{
                      left: `${overlayPosX}%`,
                      top: `${overlayPosY}%`,
                      transform: "translate(-50%, -50%)",
                      width: `${CANVAS_SIZE * overlayScale}px`,
                      height: `${CANVAS_SIZE * overlayScale}px`,
                      borderRadius:
                        overlayShape === "circle"
                          ? "999px"
                          : overlayShape === "square"
                          ? "6px"
                          : `${overlayRadius * 100}%`,
                    }}
                  >
                    <span
                      className="overlay-bg"
                      style={{
                        background: overlayBgText,
                        opacity: overlayBgAlpha,
                        borderRadius:
                          overlayShape === "circle"
                            ? "999px"
                            : overlayShape === "square"
                            ? "6px"
                            : `${overlayRadius * 100}%`,
                      }}
                    ></span>
                    <SecondaryIconComponent
                      size={CANVAS_SIZE * overlayScale * (1 - overlayPadding)}
                      stroke={secondaryStrokeText}
                      strokeWidth={secondaryStrokeWidth}
                    />
                  </span>
                ) : null}
              </div>
            </div>
          <div className="sizes">
            {DEFAULT_SIZES.map((size) => (
              <span key={size}>{size}px</span>
            ))}
            <div className="size-chips">
              {EXTRA_SIZES.map((size) => (
                <button
                  key={size}
                  type="button"
                  className={`size-chip ${extraSizes[size] ? "active" : ""}`}
                  onClick={() =>
                    setExtraSizes((prev) => ({
                      ...prev,
                      [size]: !prev[size],
                    }))
                  }
                >
                  {size}px
                </button>
              ))}
            </div>
          </div>
        </section>
          <section className="icon-grid">
            <div className="grid-header">
              <h2>Lucide Icons</h2>
              <input
                type="text"
                placeholder="Search icons..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <SelectedIcons
              primaryIcon={primaryIcon}
              secondaryIcon={secondaryIcon}
              onClearPrimary={() => setPrimaryIcon("")}
              onClearSecondary={() => setSecondaryIcon("")}
            />
            <hr className="grid-divider" />
            <IconGrid icons={filteredIcons} selected={selectedList} onSelect={handleSelectIcon} />
          </section>
        </div>
      </div>
    </div>
  );
}
