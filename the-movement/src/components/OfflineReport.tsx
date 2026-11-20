'use client';
import { duration, fmt } from '@/engine/text';
import type { OfflineReport } from '@/engine/types';
import { useStore } from '@/store/game';
import { Modal } from './ui';

export default function OfflineReportModal({ report, onClose }: { report: OfflineReport; onClose: () => void }) {
  const { setPanel, game } = useStore();
  return (
    <Modal title="While You Were Away" onClose={onClose} doc>
      <p className="font-serif">
        {game?.movement.founderTitle}, you were absent for {duration(report.seconds)}
        {report.capped ? ' (progress is capped; the movement does rest occasionally)' : ''}. In your absence:
      </p>
      <ul className="mt-3 list-inside list-disc space-y-1 font-serif">
        <li>{fmt(report.newFollowers)} new followers.</li>
        {report.cities85.length > 0 && (
          <li>
            {report.cities85.length} {report.cities85.length === 1 ? 'city' : 'cities'} reached 85%: {report.cities85.slice(0, 5).join(', ')}
            {report.cities85.length > 5 ? '…' : ''}.
          </li>
        )}
        {report.outpostZealots > 0 && <li>Outposts produced {report.outpostZealots} zealot{report.outpostZealots === 1 ? '' : 's'}.</li>}
        {report.zealotsProduced > 0 && <li>{report.zealotsProduced} new zealots in total await your instructions.</li>}
        {report.headlines.slice(0, 4).map((h) => (
          <li key={h}>{h}</li>
        ))}
        {report.pendingDecisions > 0 && <li>Your followers are requesting a decision on {report.pendingDecisions} matter{report.pendingDecisions === 1 ? '' : 's'}.</li>}
      </ul>
      <div className="mt-5 flex justify-end gap-2">
        <button
          className="btn btn-sm border border-ink-800 text-ink-900"
          onClick={() => {
            setPanel('news');
            onClose();
          }}
        >
          Review events
        </button>
        <button className="btn btn-sm bg-ink-900 text-white" onClick={onClose}>
          Resume
        </button>
      </div>
    </Modal>
  );
}
