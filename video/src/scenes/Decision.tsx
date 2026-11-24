import React from 'react';
import {AbsoluteFill} from 'remotion';
import {Icon} from '../components/Icon';
import {Chip, Eyebrow, Glass, hexA, Pop, Title} from '../components/ui';
import {useT} from '../hooks';
import {C, F} from '../theme';

type Row = {label: string; value: string; state: 'ok' | 'ask' | 'bad'};

const QUESTION_ROWS: Row[] = [
  {label: 'Fix retrieved', value: 'candidate · score 0.83', state: 'ok'},
  {label: 'Approval status', value: 'active · v1', state: 'ok'},
  {label: 'Printer model', value: 'P100', state: 'ok'},
  {label: 'Firmware', value: 'not recorded', state: 'ask'},
  {label: 'Prerequisites', value: 'matched', state: 'ok'},
];

const WITHHELD_ROWS: Row[] = [
  {label: 'Fix retrieved', value: 'snapshot · P109', state: 'ok'},
  {label: 'Approval status', value: 'withdrawn', state: 'bad'},
  {label: 'Withdrawal reason', value: 'sensor torque', state: 'bad'},
  {label: 'Printer model', value: 'P109', state: 'ok'},
  {label: 'Firmware', value: '2.4', state: 'ok'},
];

const StateIcon: React.FC<{state: Row['state']}> = ({state}) => {
  const stateColor = state === 'ok' ? C.green : state === 'ask' ? C.amber : C.red;
  return (
    <div style={{width: 26, height: 26, borderRadius: 8, display: 'grid', placeItems: 'center', background: hexA(stateColor, 0.14), border: `1px solid ${hexA(stateColor, 0.4)}`, color: stateColor}}>
      <Icon name={state === 'ok' ? 'check' : state === 'ask' ? 'question' : 'x'} size={15} stroke={2.6} />
    </div>
  );
};

const CaseCard: React.FC<{
  at: number;
  tone: string;
  eyebrow: string;
  title: string;
  rows: Row[];
  outcome: string;
  action: string;
  detail: string;
  footer: string;
  session: string;
}> = ({at, tone, eyebrow, title, rows, outcome, action, detail, footer, session}) => {
  const {sp} = useT();
  const p = sp(at, {damping: 17, stiffness: 130, mass: 0.8});
  return (
    <div style={{flex: 1, transform: `translateY(${(1 - p) * 46}px)`, opacity: Math.min(1, p * 1.5)}}>
      <Glass style={{height: '100%', padding: '28px 30px', display: 'flex', flexDirection: 'column', gap: 18, borderColor: hexA(tone, 0.32), position: 'relative', overflow: 'hidden'}}>
        <div style={{position: 'absolute', right: -120, top: -130, width: 320, height: 320, borderRadius: 999, background: `radial-gradient(closest-side, ${hexA(tone, 0.17)}, transparent)`}} />
        <div style={{display: 'flex', alignItems: 'center', gap: 10}}>
          <div style={{fontFamily: F.mono, fontSize: 14, letterSpacing: 1.2, color: C.faint}}>{eyebrow}</div>
          <div style={{flex: 1, height: 1, background: C.line}} />
          <div style={{fontFamily: F.mono, fontSize: 13, color: C.faint}}>{session}</div>
        </div>
        <div style={{fontFamily: F.display, fontWeight: 700, fontSize: 31, lineHeight: 1.2, color: C.ink}}>{title}</div>
        <div style={{display: 'flex', flexDirection: 'column', gap: 10}}>
          {rows.map((row, i) => (
            <div key={row.label} style={{display: 'flex', alignItems: 'center', gap: 12, padding: '9px 0', borderBottom: i === rows.length - 1 ? 'none' : `1px solid rgba(255,255,255,0.055)`}}>
              <StateIcon state={row.state} />
              <div style={{fontFamily: F.body, fontSize: 18, color: C.muted}}>{row.label}</div>
              <div style={{marginLeft: 'auto', fontFamily: F.mono, fontSize: 16, fontWeight: 700, color: row.state === 'ok' ? C.ink : row.state === 'ask' ? C.amber : C.red}}>{row.value}</div>
            </div>
          ))}
        </div>
        <div
          style={{
            marginTop: 'auto',
            borderRadius: 14,
            padding: '17px 19px',
            background: hexA(tone, 0.12),
            border: `1px solid ${hexA(tone, 0.5)}`,
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
          }}
        >
          <div style={{fontFamily: F.mono, fontSize: 13, fontWeight: 700, letterSpacing: 1.4, color: tone}}>{outcome}</div>
          <div style={{fontFamily: F.display, fontWeight: 700, fontSize: 24, color: C.ink}}>{action}</div>
          <div style={{fontFamily: F.body, fontSize: 16, lineHeight: 1.4, color: C.muted}}>{detail}</div>
        </div>
        <div style={{fontFamily: F.mono, fontSize: 13, lineHeight: 1.4, color: C.faint}}>{footer}</div>
      </Glass>
    </div>
  );
};

export const Decision: React.FC = () => {
  return (
    <AbsoluteFill style={{padding: '80px 120px 62px', display: 'flex', flexDirection: 'column', gap: 24}}>
      <div style={{display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 36}}>
        <div>
          <Eyebrow text="The gate · live decisions" at={0.2} />
          <Title text="Missing information asks. [A] [withdrawal] [withholds.]" at={0.3} size={64} />
        </div>
        <Pop at={0.55} y={10}>
          <Chip tone="coral" size={17}>canonical record outranks retrieval</Chip>
        </Pop>
      </div>
      <div style={{display: 'flex', gap: 26, flex: 1}}>
        <CaseCard
          at={0.8}
          tone={C.amber}
          eyebrow="CASE 07 · SYNTHETIC · FRESH SESSION"
          title="P100 · faint labels after 25 pages"
          rows={QUESTION_ROWS}
          outcome="DECISION · QUESTION"
          action="Ask for the firmware version."
          detail="The record is approved, the model matches, but scope is incomplete."
          footer="No recommendation. One question returns the missing premise."
          session="2c30a56f"
        />
        <CaseCard
          at={1.5}
          tone={C.red}
          eyebrow="CASE 08 · SYNTHETIC · RETRIEVAL"
          title="P109 · curled labels near the fuser"
          rows={WITHHELD_ROWS}
          outcome="DECISION · WITHHELD"
          action="Do not apply this fix."
          detail="Retrieval still surfaced the approved snapshot; the canonical record says withdrawn."
          footer="Observed live after withdrawal. The gate refused the stale candidate."
          session="9f1b7d20"
        />
      </div>
    </AbsoluteFill>
  );
};
