import { Logo } from "@/components/ui/logo"
import Link from "next/link"
import { toast } from "sonner"

export function Footer() {
  return (
    <footer className="relative z-10 bg-gray-900/50 backdrop-blur-sm border-t border-gray-800">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 pb-0">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="col-span-2 md:col-span-1">
            <Logo variant="text" size="md" className="mb-4" />
            <p className="text-gray-400 text-sm">
              Build something amazing with AI-powered development.
            </p>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-4">Product</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="/pricing" className="text-gray-400 hover:text-white transition-colors">Plans</Link></li>
              <li><Link href="/enterprise" className="text-gray-400 hover:text-white transition-colors">Business</Link></li>
              <li><Link href="/showcase" className="text-gray-400 hover:text-white transition-colors">Showcase</Link></li>
              <li><Link href="#" className="text-gray-400 hover:text-white transition-colors cursor-pointer" onClick={(e) => { e.preventDefault(); toast.info("Coming soon!") }}>Student discount</Link></li>
              <li><Link href="#" className="text-gray-400 hover:text-white transition-colors cursor-pointer" onClick={(e) => { e.preventDefault(); toast.info("Coming soon!") }}>Solutions</Link></li>
              <li><Link href="#" className="text-gray-400 hover:text-white transition-colors cursor-pointer" onClick={(e) => { e.preventDefault(); toast.info("Coming soon!") }}>Integrations</Link></li>
              <li><Link href="#" className="text-gray-400 hover:text-white transition-colors cursor-pointer" onClick={(e) => { e.preventDefault(); toast.info("Coming soon!") }}>Changelog</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-4">Resources</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="/docs" className="text-gray-400 hover:text-white transition-colors">Docs</Link></li>
              <li><Link href="/blog" className="text-gray-400 hover:text-white transition-colors">Blog</Link></li>
              <li><Link href="/learn" className="text-gray-400 hover:text-white transition-colors">Learn</Link></li>
              <li><Link href="/privacy" className="text-gray-400 hover:text-white transition-colors">Privacy Policy</Link></li>
              <li><Link href="/terms" className="text-gray-400 hover:text-white transition-colors">Terms & Conditions</Link></li>
              <li><Link href="/refund-policy" className="text-gray-400 hover:text-white transition-colors">Refund Policy</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-4">Community</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="/community" className="text-gray-400 hover:text-white transition-colors">Community</Link></li>
              <li><Link href="/docs" className="text-gray-400 hover:text-white transition-colors">Support</Link></li>
              <li><Link href="#" className="text-gray-400 hover:text-white transition-colors cursor-pointer" onClick={(e) => { e.preventDefault(); toast.info("Coming soon!") }}>Discord</Link></li>
              <li><Link href="#" className="text-gray-400 hover:text-white transition-colors cursor-pointer" onClick={(e) => { e.preventDefault(); toast.info("Coming soon!") }}>Reddit</Link></li>
              <li><Link href="#" className="text-gray-400 hover:text-white transition-colors cursor-pointer" onClick={(e) => { e.preventDefault(); toast.info("Coming soon!") }}>X/Twitter</Link></li>
              <li><Link href="#" className="text-gray-400 hover:text-white transition-colors cursor-pointer" onClick={(e) => { e.preventDefault(); toast.info("Coming soon!") }}>LinkedIn</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center">
          <div className="flex items-center space-x-4 mb-4 md:mb-0">
            <Logo variant="icon" size="sm" />
            <span className="text-gray-400 text-sm">EN</span>
          </div>
          <div className="text-gray-400 text-sm">
            © 2025 PiPilot. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  )
}
