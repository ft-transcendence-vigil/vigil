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
      className="flex items-center w-11.25 h-5.25 bg-vigil-card border border-[#4a5d7e] rounded-none cursor-pointer transition-[background] duration-200 data-[state=checked]:bg-[#00d68f26] data-[state=checked]:border-[#00d68f]"
      checked={checked}
      onCheckedChange={onCheckedChange}
    >
      <Switch.Thumb className="block w-4 h-4 bg-[#4a5d7e] translate-x-0.5 transition-transform data-[state=checked]:translate-x-[25.75px] data-[state=checked]:bg-[#00d68f] duration-200" />
    </Switch.Root>
  );
}
