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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

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
  previewUrl: string
  category: string
  templateType: 'free' | 'paid'
  templatePrice: string
  onNameChange: (value: string) => void
  onDescriptionChange: (value: string) => void
  onPreviewUrlChange: (value: string) => void
  onCategoryChange: (value: string) => void
  onTemplateTypeChange: (type: 'free' | 'paid') => void
  onTemplatePriceChange: (price: string) => void
  onConfirm: () => void
  isPublishing: boolean
}

export function PublishTemplateDialog({
  open,
  onOpenChange,
  project,
  name,
  description,
  previewUrl,
  category,
  templateType,
  templatePrice,
  onNameChange,
  onDescriptionChange,
  onPreviewUrlChange,
  onCategoryChange,
  onTemplateTypeChange,
  onTemplatePriceChange,
  onConfirm,
  isPublishing
}: PublishTemplateDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-gray-900 border-gray-800 text-white max-h-[600px] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="text-green-400">Publish as Template</DialogTitle>
          <DialogDescription className="text-gray-300">
            Share your project as a community template. Others will be able to use it as a starting point for their projects.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 overflow-y-auto flex-1 pr-2">
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
              className="bg-gray-800 border-gray-700 text-white h-32 resize-none overflow-y-auto"
              placeholder="Describe what makes this template useful..."
            />
          </div>
          <div>
            <Label htmlFor="template-preview-url" className="text-white">Preview URL (optional)</Label>
            <Input
              id="template-preview-url"
              value={previewUrl}
              onChange={(e) => onPreviewUrlChange(e.target.value)}
              className="bg-gray-800 border-gray-700 text-white"
              placeholder="https://your-demo-url.com (optional)"
              type="url"
            />
          </div>

          <div>
            <Label htmlFor="template-category" className="text-white">Category</Label>
            <Select value={category} onValueChange={onCategoryChange}>
              <SelectTrigger id="template-category" className="bg-gray-800 border-gray-700 text-white">
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700">
                <SelectItem value="landing-page">Landing Page</SelectItem>
                <SelectItem value="dashboard">Dashboard</SelectItem>
                <SelectItem value="ecommerce">E-commerce</SelectItem>
                <SelectItem value="blog">Blog</SelectItem>
                <SelectItem value="portfolio">Portfolio</SelectItem>
                <SelectItem value="saas">SaaS</SelectItem>
                <SelectItem value="mobile">Mobile App UI</SelectItem>
                <SelectItem value="admin">Admin Panel</SelectItem>
                <SelectItem value="social">Social Network</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Pricing Section */}
          <div className="border-t border-gray-700 pt-4">
            <Label className="text-white font-semibold mb-3 block">Template Pricing</Label>
            <RadioGroup value={templateType} onValueChange={(value) => onTemplateTypeChange(value as 'free' | 'paid')}>
              <div className="flex items-center space-x-2 mb-3">
                <RadioGroupItem value="free" id="free-option" />
                <Label htmlFor="free-option" className="text-gray-300 cursor-pointer font-normal">
                  Free Template - Anyone can download
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="paid" id="paid-option" />
                <Label htmlFor="paid-option" className="text-gray-300 cursor-pointer font-normal">
                  Paid Template
                </Label>
              </div>
            </RadioGroup>

            {templateType === 'paid' && (
              <div className="mt-4 p-3 bg-gray-800 rounded-lg border border-gray-700">
                <Label htmlFor="template-price" className="text-white text-sm">Price (USD)</Label>
                <div className="flex items-center mt-2">
                  <span className="text-gray-400 mr-2">$</span>
                  <Input
                    id="template-price"
                    type="number"
                    step="0.99"
                    min="0.99"
                    max="999.99"
                    value={templatePrice}
                    onChange={(e) => onTemplatePriceChange(e.target.value)}
                    className="bg-gray-700 border-gray-600 text-white flex-1"
                    placeholder="9.99"
                  />
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  Minimum: $0.99 | Maximum: $999.99
                </p>
              </div>
            )}
          </div>
        </div>
        
        <DialogFooter className="gap-2 flex-shrink-0">
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
