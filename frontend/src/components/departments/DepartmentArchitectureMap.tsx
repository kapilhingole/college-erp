import React, { useState } from 'react';
import { ZoomIn, ZoomOut, RotateCcw, Maximize2, Info, Building2, BookOpen, Users, CheckCircle2 } from 'lucide-react';

export type NodeId =
  | 'CENTRAL_DEPARTMENT'
  | 'DEPT_CE'
  | 'DEPT_AIDS'
  | 'DEPT_ECE'
  | 'DEPT_ENTC'
  | 'CE_STUDENT_OVERVIEW'
  | 'CE_SYLLABUS_MONITORING'
  | 'CE_SUBJECTS_PROFESSORS'
  | 'AIDS_SUBJECTS_1'
  | 'AIDS_SUBJECTS_2'
  | 'AIDS_STUDENT_OVERVIEW'
  | 'AIDS_SYLLABUS_MONITORING'
  | 'ECE_SUBJECTS_1'
  | 'ECE_SUBJECTS_2'
  | 'ECE_STUDENT_OVERVIEW'
  | 'ECE_SYLLABUS_MONITORING'
  | 'ENTC_SUBJECTS_PROFESSORS'
  | 'ENTC_SYLLABUS_MONITORING'
  | 'ENTC_STUDENT_OVERVIEW';

interface DepartmentArchitectureMapProps {
  selectedNode: NodeId;
  onSelectNode: (nodeId: NodeId) => void;
  deptStats?: Record<string, { students: number; faculty: number; subjects: number; progress: number }>;
}

export const DepartmentArchitectureMap: React.FC<DepartmentArchitectureMapProps> = ({
  selectedNode,
  onSelectNode,
  deptStats = {},
}) => {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [startPan, setStartPan] = useState({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent) => {
    // Only pan if clicking canvas background
    if ((e.target as HTMLElement).tagName === 'svg' || (e.target as HTMLElement).id === 'map-bg') {
      setIsPanning(true);
      setStartPan({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setPan({ x: e.clientX - startPan.x, y: e.clientY - startPan.y });
    }
  };

  const handleMouseUp = () => setIsPanning(false);

  const resetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  // -------------------------------------------------------------
  // Node coordinates in 1200 x 680 SVG viewport
  // -------------------------------------------------------------
  const CENTER = { x: 600, y: 340 };

  // 4 Department Cloud centers
  const POS_CE = { x: 600, y: 195 };
  const POS_ENTC = { x: 600, y: 485 };
  const POS_AIDS = { x: 260, y: 340 };
  const POS_ECE = { x: 940, y: 340 };

  // CE Connected Nodes (All Hexagonal in diagram)
  const POS_CE_STUDENT = { x: 600, y: 55 }; // Top (Hexagon)
  const POS_CE_SYLLABUS = { x: 410, y: 195 }; // Left (Hexagon)
  const POS_CE_SUBJECTS = { x: 790, y: 195 }; // Right (Hexagon)

  // E&TC Connected Nodes (All Hexagonal in diagram)
  const POS_ENTC_SUBJECTS = { x: 600, y: 625 }; // Down (Hexagon)
  const POS_ENTC_SYLLABUS = { x: 410, y: 485 }; // Left (Hexagon)
  const POS_ENTC_STUDENT = { x: 790, y: 485 }; // Right (Hexagon)

  // AIDS Connected Nodes (Rounded Rectangles in diagram)
  const POS_AIDS_SUBJ_UP = { x: 260, y: 175 }; // Up (Rect)
  const POS_AIDS_SUBJ_LEFT = { x: 70, y: 340 }; // Left (Rect)
  const POS_AIDS_STUDENT = { x: 260, y: 505 }; // Down (Rect)

  // ECE Connected Nodes (Rounded Rectangles in diagram)
  const POS_ECE_SUBJ_UP = { x: 940, y: 175 }; // Up (Rect)
  const POS_ECE_SUBJ_RIGHT = { x: 1130, y: 340 }; // Right (Rect)
  const POS_ECE_STUDENT = { x: 940, y: 505 }; // Down (Rect)

  // -------------------------------------------------------------
  // Shape Renderers
  // -------------------------------------------------------------

  /** Draws a 6-sided hexagon with flat top & bottom, centered at (cx, cy) */
  const renderHexagon = (
    id: NodeId,
    cx: number,
    cy: number,
    w: number,
    h: number,
    lines: string[],
    badge?: string
  ) => {
    const isSelected = selectedNode === id;
    const cut = 16;
    const points = [
      `${cx - w / 2 + cut},${cy - h / 2}`,
      `${cx + w / 2 - cut},${cy - h / 2}`,
      `${cx + w / 2},${cy}`,
      `${cx + w / 2 - cut},${cy + h / 2}`,
      `${cx - w / 2 + cut},${cy + h / 2}`,
      `${cx - w / 2},${cy}`,
    ].join(' ');

    return (
      <g
        className="cursor-pointer transition-transform duration-200 select-none group"
        onClick={() => onSelectNode(id)}
      >
        {/* Glow if selected */}
        {isSelected && (
          <polygon
            points={points}
            fill="none"
            stroke="#3b82f6"
            strokeWidth="8"
            strokeOpacity="0.3"
            className="animate-pulse"
          />
        )}
        <polygon
          points={points}
          fill={isSelected ? '#f8fafc' : '#ffffff'}
          stroke={isSelected ? '#1e293b' : '#334155'}
          strokeWidth={isSelected ? '2.5' : '1.8'}
          filter="drop-shadow(0 2px 4px rgba(0,0,0,0.06))"
          className="transition-colors group-hover:fill-slate-50 group-hover:stroke-slate-900"
        />
        {/* Multi-line label */}
        <text
          x={cx}
          y={cy - (lines.length - 1) * 7}
          textAnchor="middle"
          dominantBaseline="central"
          className="font-bold fill-slate-800 text-[10.5px] uppercase tracking-wider pointer-events-none"
        >
          {lines.map((line, idx) => (
            <tspan key={idx} x={cx} dy={idx === 0 ? 0 : 13}>
              {line}
            </tspan>
          ))}
        </text>
        {badge && (
          <g transform={`translate(${cx + w / 2 - 20}, ${cy - h / 2 + 2})`}>
            <rect
              width="36"
              height="15"
              rx="7.5"
              fill={isSelected ? '#1e293b' : '#f1f5f9'}
              stroke="#cbd5e1"
              strokeWidth="1"
            />
            <text
              x="18"
              y="8"
              textAnchor="middle"
              dominantBaseline="central"
              className={`text-[8.5px] font-bold ${isSelected ? 'fill-white' : 'fill-slate-700'}`}
            >
              {badge}
            </text>
          </g>
        )}
      </g>
    );
  };

  /** Draws a rounded rectangular box, centered at (cx, cy) */
  const renderRect = (
    id: NodeId,
    cx: number,
    cy: number,
    w: number,
    h: number,
    lines: string[],
    isCentral = false,
    badge?: string
  ) => {
    const isSelected = selectedNode === id;
    const x = cx - w / 2;
    const y = cy - h / 2;

    return (
      <g
        className="cursor-pointer transition-transform duration-200 select-none group"
        onClick={() => onSelectNode(id)}
      >
        {isSelected && (
          <rect
            x={x - 4}
            y={y - 4}
            width={w + 8}
            height={h + 8}
            rx={isCentral ? 16 : 12}
            fill="none"
            stroke="#3b82f6"
            strokeWidth="6"
            strokeOpacity="0.3"
            className="animate-pulse"
          />
        )}
        <rect
          x={x}
          y={y}
          width={w}
          height={h}
          rx={isCentral ? 14 : 10}
          fill={isSelected ? (isCentral ? '#0f172a' : '#f8fafc') : isCentral ? '#1e293b' : '#ffffff'}
          stroke={isCentral ? '#0f172a' : isSelected ? '#0f172a' : '#334155'}
          strokeWidth={isCentral ? '2.5' : isSelected ? '2.5' : '1.8'}
          filter="drop-shadow(0 2px 5px rgba(0,0,0,0.08))"
          className="transition-colors group-hover:fill-slate-50 group-hover:stroke-slate-900"
        />
        <text
          x={cx}
          y={cy - (lines.length - 1) * 7}
          textAnchor="middle"
          dominantBaseline="central"
          className={`font-bold ${isCentral ? 'fill-white text-[12px] tracking-widest' : 'fill-slate-800 text-[10.5px] tracking-wider'} uppercase pointer-events-none`}
        >
          {lines.map((line, idx) => (
            <tspan key={idx} x={cx} dy={idx === 0 ? 0 : 13}>
              {line}
            </tspan>
          ))}
        </text>
        {badge && (
          <g transform={`translate(${cx + w / 2 - 20}, ${y - 4})`}>
            <rect
              width="36"
              height="15"
              rx="7.5"
              fill="#f1f5f9"
              stroke="#cbd5e1"
              strokeWidth="1"
            />
            <text
              x="18"
              y="8"
              textAnchor="middle"
              dominantBaseline="central"
              className="text-[8.5px] font-bold fill-slate-700"
            >
              {badge}
            </text>
          </g>
        )}
      </g>
    );
  };

  /** Draws a scalloped cloud shape, centered at (cx, cy) */
  const renderCloud = (id: NodeId, cx: number, cy: number, label: string, deptCode: string) => {
    const isSelected = selectedNode === id;
    const stats = deptStats[deptCode] || { students: 0, faculty: 0, subjects: 0, progress: 0 };

    return (
      <g
        className="cursor-pointer transition-transform duration-200 select-none group"
        onClick={() => onSelectNode(id)}
      >
        {isSelected && (
          <circle
            cx={cx}
            cy={cy}
            r="44"
            fill="none"
            stroke="#3b82f6"
            strokeWidth="8"
            strokeOpacity="0.3"
            className="animate-pulse"
          />
        )}
        {/* Scalloped cloud path */}
        <path
          d={`
            M ${cx - 36} ${cy + 12}
            a 18 18 0 0 1 -12 -22
            a 20 20 0 0 1 24 -16
            a 24 24 0 0 1 36 -2
            a 22 22 0 0 1 24 16
            a 18 18 0 0 1 -10 24
            a 16 16 0 0 1 -20 8
            h -30
            a 16 16 0 0 1 -12 -8
            z
          `}
          fill={isSelected ? '#f0f9ff' : '#ffffff'}
          stroke={isSelected ? '#0284c7' : '#1e293b'}
          strokeWidth={isSelected ? '2.5' : '1.8'}
          strokeLinejoin="round"
          filter="drop-shadow(0 3px 6px rgba(0,0,0,0.08))"
          className="transition-colors group-hover:fill-sky-50 group-hover:stroke-sky-600"
        />
        {/* Center label */}
        <text
          x={cx}
          y={cy - 2}
          textAnchor="middle"
          dominantBaseline="central"
          className="font-black text-sm tracking-widest fill-slate-900 pointer-events-none"
        >
          {label}
        </text>
        {/* Bottom pill for quick student / faculty badge */}
        <g transform={`translate(${cx - 32}, ${cy + 22})`}>
          <rect
            width="64"
            height="15"
            rx="7.5"
            fill={isSelected ? '#0284c7' : '#f8fafc'}
            stroke={isSelected ? '#0284c7' : '#e2e8f0'}
            strokeWidth="1"
          />
          <text
            x="32"
            y="8"
            textAnchor="middle"
            dominantBaseline="central"
            className={`text-[8.5px] font-bold ${isSelected ? 'fill-white' : 'fill-slate-600'} pointer-events-none`}
          >
            {stats.students} St · {stats.faculty} Fac
          </text>
        </g>
      </g>
    );
  };

  /** Draws a directed arrow from (x1, y1) to (x2, y2) */
  const renderArrow = (
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    active = false
  ) => {
    return (
      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke={active ? '#0284c7' : '#334155'}
        strokeWidth={active ? '2.4' : '1.5'}
        markerEnd={active ? 'url(#arrow-active)' : 'url(#arrow)'}
        strokeLinecap="round"
        className="transition-all duration-200"
      />
    );
  };

  return (
    <div className="relative w-full bg-slate-50/70 rounded-2xl border border-slate-200/80 overflow-hidden shadow-inner">
      {/* Top floating control toolbar */}
      <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5 bg-white/90 backdrop-blur-md px-2 py-1.5 rounded-xl border border-slate-200 shadow-sm text-xs text-slate-700">
        <button
          onClick={() => setZoom((z) => Math.min(z + 0.15, 1.8))}
          className="p-1 hover:bg-slate-100 rounded-lg transition"
          title="Zoom In"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => setZoom((z) => Math.max(z - 0.15, 0.6))}
          className="p-1 hover:bg-slate-100 rounded-lg transition"
          title="Zoom Out"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={resetView}
          className="p-1 hover:bg-slate-100 rounded-lg transition"
          title="Reset Zoom & Pan"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
        <div className="h-3 w-px bg-slate-200 mx-0.5" />
        <span className="text-[10px] font-mono text-slate-400 font-semibold px-1">
          {Math.round(zoom * 100)}%
        </span>
      </div>

      {/* SVG Canvas */}
      <div
        className="w-full overflow-hidden cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      >
        <svg
          viewBox="0 0 1200 680"
          className="w-full h-auto select-none transition-transform duration-75"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: 'center center',
          }}
        >
          <defs>
            {/* Standard arrow marker */}
            <marker
              id="arrow"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#334155" />
            </marker>
            {/* Highlighted active arrow marker */}
            <marker
              id="arrow-active"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="7"
              markerHeight="7"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 9 5 L 0 9 z" fill="#0284c7" />
            </marker>
          </defs>

          {/* Canvas Background for dragging */}
          <rect id="map-bg" width="1200" height="680" fill="transparent" />

          {/* ======================================================= */}
          {/* 1. ARROWS (Flowing one-directionally as in diagram)     */}
          {/* ======================================================= */}

          {/* Central Department -> 4 Department Clouds */}
          {renderArrow(CENTER.x, CENTER.y - 30, POS_CE.x, POS_CE.y + 40, selectedNode === 'DEPT_CE')}
          {renderArrow(CENTER.x, CENTER.y + 30, POS_ENTC.x, POS_ENTC.y - 38, selectedNode === 'DEPT_ENTC')}
          {renderArrow(CENTER.x - 70, CENTER.y, POS_AIDS.x + 48, POS_AIDS.y, selectedNode === 'DEPT_AIDS')}
          {renderArrow(CENTER.x + 70, CENTER.y, POS_ECE.x - 48, POS_ECE.y, selectedNode === 'DEPT_ECE')}

          {/* CE -> 3 Outbound Connected Nodes */}
          {renderArrow(POS_CE.x, POS_CE.y - 38, POS_CE_STUDENT.x, POS_CE_STUDENT.y + 26, selectedNode === 'CE_STUDENT_OVERVIEW')}
          {renderArrow(POS_CE.x - 48, POS_CE.y, POS_CE_SYLLABUS.x + 70, POS_CE_SYLLABUS.y, selectedNode === 'CE_SYLLABUS_MONITORING')}
          {renderArrow(POS_CE.x + 48, POS_CE.y, POS_CE_SUBJECTS.x - 65, POS_CE_SUBJECTS.y, selectedNode === 'CE_SUBJECTS_PROFESSORS')}

          {/* E&TC -> 3 Outbound Connected Nodes */}
          {renderArrow(POS_ENTC.x, POS_ENTC.y + 40, POS_ENTC_SUBJECTS.x, POS_ENTC_SUBJECTS.y - 28, selectedNode === 'ENTC_SUBJECTS_PROFESSORS')}
          {renderArrow(POS_ENTC.x - 48, POS_ENTC.y, POS_ENTC_SYLLABUS.x + 70, POS_ENTC_SYLLABUS.y, selectedNode === 'ENTC_SYLLABUS_MONITORING')}
          {renderArrow(POS_ENTC.x + 48, POS_ENTC.y, POS_ENTC_STUDENT.x - 65, POS_ENTC_STUDENT.y, selectedNode === 'ENTC_STUDENT_OVERVIEW')}

          {/* AIDS -> 3 Outbound Connected Nodes */}
          {renderArrow(POS_AIDS.x, POS_AIDS.y - 38, POS_AIDS_SUBJ_UP.x, POS_AIDS_SUBJ_UP.y + 26, selectedNode === 'AIDS_SUBJECTS_1')}
          {renderArrow(POS_AIDS.x - 48, POS_AIDS.y, POS_AIDS_SUBJ_LEFT.x + 65, POS_AIDS_SUBJ_LEFT.y, selectedNode === 'AIDS_SUBJECTS_2')}
          {renderArrow(POS_AIDS.x, POS_AIDS.y + 40, POS_AIDS_STUDENT.x, POS_AIDS_STUDENT.y - 26, selectedNode === 'AIDS_STUDENT_OVERVIEW')}

          {/* ECE -> 3 Outbound Connected Nodes */}
          {renderArrow(POS_ECE.x, POS_ECE.y - 38, POS_ECE_SUBJ_UP.x, POS_ECE_SUBJ_UP.y + 26, selectedNode === 'ECE_SUBJECTS_1')}
          {renderArrow(POS_ECE.x + 48, POS_ECE.y, POS_ECE_SUBJ_RIGHT.x - 65, POS_ECE_SUBJ_RIGHT.y, selectedNode === 'ECE_SUBJECTS_2')}
          {renderArrow(POS_ECE.x, POS_ECE.y + 40, POS_ECE_STUDENT.x, POS_ECE_STUDENT.y - 26, selectedNode === 'ECE_STUDENT_OVERVIEW')}

          {/* ======================================================= */}
          {/* 2. NODES (Exact shapes & labels from the diagram)       */}
          {/* ======================================================= */}

          {/* Central Department Node (Rounded Rectangle) */}
          {renderRect(
            'CENTRAL_DEPARTMENT',
            CENTER.x,
            CENTER.y,
            140,
            60,
            ['DEPARTMENT'],
            true
          )}

          {/* 4 Department Clouds */}
          {renderCloud('DEPT_CE', POS_CE.x, POS_CE.y, 'CE', 'COMP')}
          {renderCloud('DEPT_ENTC', POS_ENTC.x, POS_ENTC.y, 'E&TC', 'ENTC')}
          {renderCloud('DEPT_AIDS', POS_AIDS.x, POS_AIDS.y, 'AIDS', 'AIDS')}
          {renderCloud('DEPT_ECE', POS_ECE.x, POS_ECE.y, 'ECE', 'ECE')}

          {/* CE Children (Hexagonal Blocks) */}
          {renderHexagon(
            'CE_STUDENT_OVERVIEW',
            POS_CE_STUDENT.x,
            POS_CE_STUDENT.y,
            135,
            54,
            ['THAT DEPARTMENT', 'STUDENT', 'OVERVIEW'],
            `${deptStats['COMP']?.students || 233}`
          )}
          {renderHexagon(
            'CE_SYLLABUS_MONITORING',
            POS_CE_SYLLABUS.x,
            POS_CE_SYLLABUS.y,
            140,
            62,
            ['SYLLABUS', 'MONITORING', 'BY PROFESSOR', 'LOAD COMPLETION'],
            `${deptStats['COMP']?.progress || 0}%`
          )}
          {renderHexagon(
            'CE_SUBJECTS_PROFESSORS',
            POS_CE_SUBJECTS.x,
            POS_CE_SUBJECTS.y,
            135,
            58,
            ['SUBJECT AND', 'THEIR', 'PROFESSOR'],
            `${deptStats['COMP']?.subjects || 6}`
          )}

          {/* E&TC Children (Hexagonal Blocks) */}
          {renderHexagon(
            'ENTC_SUBJECTS_PROFESSORS',
            POS_ENTC_SUBJECTS.x,
            POS_ENTC_SUBJECTS.y,
            135,
            58,
            ['SUBJECT AND', 'THEIR', 'PROFESSOR'],
            `${deptStats['ENTC']?.subjects || 6}`
          )}
          {renderHexagon(
            'ENTC_SYLLABUS_MONITORING',
            POS_ENTC_SYLLABUS.x,
            POS_ENTC_SYLLABUS.y,
            140,
            62,
            ['SYLLABUS', 'MONITORING', 'BY PROFESSOR', 'LOAD COMPLETION'],
            `${deptStats['ENTC']?.progress || 0}%`
          )}
          {renderHexagon(
            'ENTC_STUDENT_OVERVIEW',
            POS_ENTC_STUDENT.x,
            POS_ENTC_STUDENT.y,
            135,
            54,
            ['THAT DEPARTMENT', 'STUDENT', 'OVERVIEW'],
            `${deptStats['ENTC']?.students || 111}`
          )}

          {/* AIDS Children (Rounded Rectangles) */}
          {renderRect(
            'AIDS_SUBJECTS_1',
            POS_AIDS_SUBJ_UP.x,
            POS_AIDS_SUBJ_UP.y,
            130,
            52,
            ['SUBJECT AND', 'THEIR PROFESSOR'],
            false,
            'Theory'
          )}
          {renderRect(
            'AIDS_SUBJECTS_2',
            POS_AIDS_SUBJ_LEFT.x,
            POS_AIDS_SUBJ_LEFT.y,
            130,
            52,
            ['SUBJECT AND', 'THEIR PROFESSOR'],
            false,
            'Lab'
          )}
          {renderRect(
            'AIDS_STUDENT_OVERVIEW',
            POS_AIDS_STUDENT.x,
            POS_AIDS_STUDENT.y,
            130,
            52,
            ['THAT DEPARTMENT', 'STUDENT', 'OVERVIEW'],
            false,
            `${deptStats['AIDS']?.students || 249}`
          )}

          {/* ECE Children (Rounded Rectangles) */}
          {renderRect(
            'ECE_SUBJECTS_1',
            POS_ECE_SUBJ_UP.x,
            POS_ECE_SUBJ_UP.y,
            130,
            52,
            ['SUBJECT AND', 'THEIR PROFESSOR'],
            false,
            'Theory'
          )}
          {renderRect(
            'ECE_SUBJECTS_2',
            POS_ECE_SUBJ_RIGHT.x,
            POS_ECE_SUBJ_RIGHT.y,
            130,
            52,
            ['SUBJECT AND', 'THEIR PROFESSOR'],
            false,
            'Lab'
          )}
          {renderRect(
            'ECE_STUDENT_OVERVIEW',
            POS_ECE_STUDENT.x,
            POS_ECE_STUDENT.y,
            130,
            52,
            ['THAT DEPARTMENT', 'STUDENT', 'OVERVIEW'],
            false,
            `${deptStats['ECE']?.students || 103}`
          )}
        </svg>
      </div>

      {/* Bottom Shape Semantics Legend */}
      <div className="px-5 py-2.5 bg-white/90 border-t border-slate-200/80 flex flex-wrap items-center justify-between text-xs text-slate-500">
        <div className="flex items-center gap-4">
          <span className="font-semibold text-slate-700 flex items-center gap-1">
            <Info className="w-3.5 h-3.5 text-blue-500" /> Legend:
          </span>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-3 rounded-md bg-slate-800 border border-slate-900" />
            <span className="text-[11px]">Central Hub</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-3 rounded-full bg-sky-100 border border-sky-600" />
            <span className="text-[11px]">Department Cloud</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div
              className="w-3.5 h-3 bg-white border border-slate-700"
              style={{ clipPath: 'polygon(20% 0%, 80% 0%, 100% 50%, 80% 100%, 20% 100%, 0% 50%)' }}
            />
            <span className="text-[11px]">Hexagonal Node (CE / E&TC)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-3 rounded bg-white border border-slate-700" />
            <span className="text-[11px]">Rectangular Node (AIDS / ECE)</span>
          </div>
        </div>

        <div className="text-[11px] text-slate-400">
          Click any block to drill down into live records &bull; Drag to pan &bull; Scroll/buttons to zoom
        </div>
      </div>
    </div>
  );
};
