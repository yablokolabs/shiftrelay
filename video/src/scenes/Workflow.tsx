import React from 'react';
import {AbsoluteFill} from 'remotion';
import {Icon} from '../components/Icon';
import {Chip, Eyebrow, Glass, hexA, Pop, Title} from '../components/ui';
import {useT} from '../hooks';
import {C, F} from '../theme';

const STEPS = [
  {
    at: 1.0,
    icon: 'chat',
    title: 'Capture',
    desc: 'Intake writes the case and transcript to Meko.',
    lines: ['conversation_create   → synthetic P100 case', 'memory_add            → proposed, not approved', 'scope                 → model · firmware · prerequisite'],
    output: 'PROPOSED · awaiting review',
    tone: C.cyan,
  },
  {
    at: 4.2,
    icon: 'shield',
    title: 'Approve',
    desc: 'A named technician promotes an approved snapshot.',
    lines: ['memory_promote        → shared knowledge', 'control.json          → expected revision check', 'approval_event        → immutable audit memory'],
    output: 'APPROVED · v1 · R. Chen',
    tone: C.coral,
  },
  {
    at: 7.4,
    icon: 'refresh',
    title: 'Retrieve',
    desc: 'A different session searches shared knowledge.',
    lines: ['knowledgebase_search  → candidate fix + snapshot', 'session               → new agent, no chat history', 'candidate             → data, not authority'],
    output: 'CANDIDATE · score 0.83',
    tone: C.cyan,
  },
  {
    at: 10.6,
    icon: 'check',
    title: 'Gate',
    desc: 'Typed checks resolve status at decision time.',
    lines: ['approval_status       ✓ active', 'fix_version           ✓ v1', 'printer_model         ✓ P100', 'firmware              ? not recorded'],
    output: 'QUESTION · ask for firmware',
    tone: C.amber,
  },
];

const StepIcon: React.FC<{index: number; active: boolean; done: boolean}> = ({index, active, done}) => (
  <div
    style={{
      width: 52,
      height: 52,
      borderRadius: 15,
      display: 'grid',
      placeItems: 'center',
      flexShrink: 0,
      fontFamily: F.mono,
      fontWeight: 700,
      fontSize: 18,
      color: done || active ? '#031b18' : C.muted,
      background: done ? C.coralSoft : active ? C.coral : 'rgba(255,255,255,0.06)',
      border: active ? `2px solid ${C.coralSoft}` : `1px solid ${C.line}`,
      boxShadow: active ? `0 0 30px ${hexA(C.coral, 0.55)}` : 'none',
      transition: 'none',
    }}
  >
    {done ? <Icon name="check" size={24} /> : `0${index + 1}`}
  </div>
);

export const Workflow: React.FC = () => {
  const {frame, fps, sp} = useT();
  const active = STEPS.reduce((acc, step, index) => (frame >= Math.round(step.at * fps) ? index : acc), 0);
  const step = STEPS[active];
  const local = frame / fps - step.at;
  const appear = Math.min(1, sp(0.25) * 1.4);
  return (
    <AbsoluteFill style={{padding: '94px 120px 72px', display: 'flex', flexDirection: 'column', gap: 30}}>
      <div style={{display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 40}}>
        <div>
          <Eyebrow text="How it works" at={0.2} />
          <Title text="From conversation to [a] [checked] [decision]" at={0.35} size={72} />
        </div>
        <Pop at={0.7} y={12}>
          <Chip tone="muted" size={17}>one datapack · three roles · fresh sessions</Chip>
        </Pop>
      </div>
      <div style={{display: 'flex', gap: 58, flex: 1, minHeight: 0}}>
        <div style={{width: 690, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 6, opacity: appear}}>
          {STEPS.map((item, index) => {
            const activeRow = index === active;
            const done = index < active;
            return (
              <div key={item.title} style={{display: 'flex', gap: 20, alignItems: 'flex-start', position: 'relative', paddingBottom: 20}}>
                {index < STEPS.length - 1 && (
                  <div style={{position: 'absolute', left: 25, top: 54, bottom: 0, width: 2, background: done ? hexA(C.coral, 0.7) : C.line}} />
                )}
                <StepIcon index={index} active={activeRow} done={done} />
                <div style={{paddingTop: 3}}>
                  <div style={{fontFamily: F.display, fontWeight: 700, fontSize: 30, color: activeRow || done ? C.ink : C.muted}}>{item.title}</div>
                  <div style={{fontFamily: F.body, fontSize: 20, lineHeight: 1.35, color: activeRow ? C.muted : C.faint, marginTop: 3, maxWidth: 590}}>{item.desc}</div>
                </div>
              </div>
            );
          })}
          <Pop at={13.4} y={14} style={{marginTop: 8}}>
            <div style={{display: 'flex', alignItems: 'center', gap: 14, padding: '17px 22px', borderRadius: 14, background: hexA(C.coral, 0.12), border: `1px solid ${hexA(C.coral, 0.4)}`}}>
              <Icon name="shield" size={25} color={C.coralSoft} />
              <div style={{fontFamily: F.body, fontSize: 21, color: C.ink}}>
                Retrieved content is <b style={{color: C.coralSoft}}>data</b>, never authority.
              </div>
            </div>
          </Pop>
        </div>
        <div style={{flex: 1, display: 'flex', alignItems: 'center'}}>
          <Glass style={{width: '100%', minHeight: 610, padding: 0, overflow: 'hidden', position: 'relative'}}>
            <div style={{display: 'flex', alignItems: 'center', gap: 9, padding: '18px 24px', borderBottom: `1px solid ${C.line}`}}>
              <div style={{width: 11, height: 11, borderRadius: 9, background: '#ff7b72'}} />
              <div style={{width: 11, height: 11, borderRadius: 9, background: '#f2c94c'}} />
              <div style={{width: 11, height: 11, borderRadius: 9, background: '#3ddc97'}} />
              <div style={{marginLeft: 12, fontFamily: F.mono, fontSize: 16, color: C.faint}}>shiftrelay · {step.title.toLowerCase()}</div>
              <div style={{marginLeft: 'auto', ...chipStyle(step.tone)}}>STEP 0{active + 1}</div>
            </div>
            <div style={{padding: '30px 34px', display: 'flex', flexDirection: 'column', gap: 24}}>
              <div style={{display: 'flex', alignItems: 'center', gap: 16}}>
                <div style={{width: 58, height: 58, borderRadius: 16, display: 'grid', placeItems: 'center', background: hexA(step.tone, 0.16), color: step.tone, border: `1px solid ${hexA(step.tone, 0.4)}`}}>
                  <Icon name={step.icon} size={29} />
                </div>
                <div>
                  <div style={{fontFamily: F.display, fontWeight: 700, fontSize: 30, color: C.ink}}>{step.title}</div>
                  <div style={{fontFamily: F.body, fontSize: 18, color: C.muted}}>{step.desc}</div>
                </div>
              </div>
              <div style={{borderRadius: 14, border: `1px solid ${C.line}`, background: 'rgba(0,0,0,0.25)', padding: '22px 20px', display: 'flex', flexDirection: 'column', gap: 16}}>
                {step.lines.map((line, i) => {
                  const p = Math.min(1, Math.max(0, (local - 0.15 - i * 0.16) / 0.28));
                  return (
                    <div key={line} style={{fontFamily: F.mono, fontSize: 17, lineHeight: 1.35, color: i === step.lines.length - 1 && active === 3 ? C.amber : C.ink, opacity: 0.25 + p * 0.75, transform: `translateX(${(1 - p) * 10}px)`}}>
                      {line}
                    </div>
                  );
                })}
              </div>
              <div style={{display: 'flex', alignItems: 'center', gap: 12}}>
                <div style={{fontFamily: F.mono, fontSize: 14, letterSpacing: 1.5, color: C.faint, textTransform: 'uppercase'}}>Result</div>
                <div style={{height: 1, flex: 1, background: C.line}} />
              </div>
              <div
                style={{
                  padding: '16px 20px',
                  borderRadius: 12,
                  background: hexA(step.tone, 0.13),
                  border: `1px solid ${hexA(step.tone, 0.5)}`,
                  color: step.tone,
                  fontFamily: F.mono,
                  fontWeight: 700,
                  fontSize: 18,
                  letterSpacing: 0.4,
                }}
              >
                {step.output}
              </div>
              <div style={{display: 'flex', gap: 8, flexWrap: 'wrap'}}>
                {(active === 0 ? ['new session', 'memory'] : active === 1 ? ['human approval', 'versioned'] : active === 2 ? ['different session', 'read-only'] : ['deterministic', 'stale-aware']).map((tag) => (
                  <Chip key={tag} tone="muted" size={15}>{tag}</Chip>
                ))}
              </div>
            </div>
          </Glass>
        </div>
      </div>
    </AbsoluteFill>
  );
};

const chipStyle = (color: string): React.CSSProperties => ({
  fontFamily: F.mono,
  fontSize: 14,
  fontWeight: 700,
  letterSpacing: 1,
  color,
  padding: '5px 10px',
  borderRadius: 7,
  border: `1px solid ${hexA(color, 0.5)}`,
  background: hexA(color, 0.12),
});
