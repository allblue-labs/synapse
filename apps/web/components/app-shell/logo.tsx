import Image from 'next/image';

export function SynapseLogo() {
  return (
    <div className="flex items-center gap-3">
      <Image
        src="/synapse-logo.PNG"
        alt="Synapse"
        width={36}
        height={36}
        className="h-9 w-9 rounded-md object-cover"
        priority
      />
      <div>
        <p className="text-sm font-semibold leading-4 text-current">Synapse</p>
        <p className="text-xs leading-4 text-current opacity-55">Core Platform</p>
      </div>
    </div>
  );
}
