import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface Project {
  id: string
  name: string
  thumbnail: string
  description: string
  category: string
  createdAt: string
}

interface PublishTemplateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  project: Project | null
  name: string
  description: string
  onNameChange: (value: string) => void
  onDescriptionChange: (value: string) => void
  onConfirm: () => void
  isPublishing: boolean
}

export function PublishTemplateDialog({
  open,
  onOpenChange,
  project,
  name,
  description,
  onNameChange,
  onDescriptionChange,
  onConfirm,
  isPublishing
}: PublishTemplateDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-gray-900 border-gray-800 text-white">
        <DialogHeader>
          <DialogTitle className="text-green-400">Publish as Template</DialogTitle>
          <DialogDescription className="text-gray-300">
            Share your project as a community template. Others will be able to use it as a starting point for their projects.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="template-name" className="text-white">Template Name</Label>
            <Input
              id="template-name"
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              className="bg-gray-800 border-gray-700 text-white"
              placeholder="Enter template name"
            />
          </div>
          
          <div>
            <Label htmlFor="template-description" className="text-white">Description</Label>
            <Textarea
              id="template-description"
              value={description}
              onChange={(e) => onDescriptionChange(e.target.value)}
              className="bg-gray-800 border-gray-700 text-white"
              placeholder="Describe what makes this template useful..."
              rows={4}
            />
          </div>
        </div>
        
        <DialogFooter className="gap-2">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            className="border-gray-600 text-gray-300 hover:bg-gray-800"
            disabled={isPublishing}
          >
            Cancel
          </Button>
          <Button 
            onClick={onConfirm}
            className="bg-green-600 hover:bg-green-700"
            disabled={isPublishing || !name.trim()}
          >
            {isPublishing ? 'Publishing...' : 'Publish Template'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
