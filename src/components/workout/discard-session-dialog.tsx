import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

type DiscardProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
};

/** Confirm permanently discarding the active session. */
export function DiscardSessionDialog({ open, onOpenChange, onConfirm }: DiscardProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Discard workout?"
      description="This session and all logged sets will be permanently deleted."
      footer={
        <>
          <Button variant="outline" onPress={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onPress={onConfirm}>
            Discard
          </Button>
        </>
      }
    />
  );
}

type ResumeProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onResume: () => void;
  onDiscard: () => void;
};

/** Cold-start prompt when an unfinished session is found. */
export function ResumeSessionDialog({ open, onOpenChange, onResume, onDiscard }: ResumeProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Resume your workout?"
      description="You have an unfinished session. Pick up where you left off, or discard it to start fresh."
      footer={
        <>
          <Button variant="destructiveTonal" onPress={onDiscard}>
            Discard
          </Button>
          <Button onPress={onResume}>Resume</Button>
        </>
      }
    />
  );
}
