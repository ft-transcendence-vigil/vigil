import * as Switch from '@radix-ui/react-switch';

interface Data {
  checked: boolean;
  onCheckedChange: () => void;
}

export default function SwitchButton({
  checked,
  onCheckedChange,
}: Data) {
  return (
    <Switch.Root
      className="flex items-center w-11.25 h-5.25 bg-vigil-card border border-vigil-chart-tick rounded-none cursor-pointer transition-[background] duration-200 data-[state=checked]:bg-vigil-success-switch data-[state=checked]:border-vigil-success"
      checked={checked}
      onCheckedChange={onCheckedChange}
    >
      <Switch.Thumb className="block w-4 h-4 bg-vigil-chart-tick translate-x-0.5 transition-transform data-[state=checked]:translate-x-[25.75px] data-[state=checked]:bg-vigil-success duration-200" />
    </Switch.Root>
  );
}
