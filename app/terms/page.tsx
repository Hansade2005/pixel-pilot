"use client"

import { Navigation } from "@/components/navigation"
import { Footer } from "@/components/footer"
import { Logo } from "@/components/ui/logo"
import { Heart } from "lucide-react"

export default function TermsPage() {
  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Enhanced Gradient Background */}
      <div className="absolute inset-0 lovable-gradient" />

      {/* Noise Texture Overlay */}
      <div className="absolute inset-0 noise-texture" />

      {/* Navigation */}
      <Navigation />

      {/* Main Content */}
      <main className="relative z-10 pt-16 pb-24">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="flex items-center justify-center mb-4">
              <div className="w-6 h-6 rounded-full heart-gradient flex items-center justify-center">
                <Heart className="w-3 h-3 text-white fill-current" />
              </div>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Terms & Conditions
            </h1>
            <p className="text-lg text-white/80">
              Last updated: January 2025
            </p>
          </div>

          {/* Terms Content */}
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-8 space-y-8">
            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">1. Agreement to Terms</h2>
              <p className="text-gray-300 leading-relaxed mb-4">
                By accessing and using Pixel Pilot ("the Service"), you agree to be bound by these Terms & Conditions ("Terms"). If you disagree with any part of these terms, then you may not access the Service.
              </p>
              <p className="text-gray-300 leading-relaxed">
                These Terms apply to all visitors, users, and others who access or use the Service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">2. Description of Service</h2>
              <p className="text-gray-300 leading-relaxed mb-4">
                Pixel Pilot is an AI-powered web application development platform that allows users to create, modify, and deploy web applications through natural language interactions. The Service provides AI-generated code, project management tools, and deployment capabilities.
              </p>
              <p className="text-gray-300 leading-relaxed">
                Our Service is operated by Pixel Pilot (the "Company", "we", "us", or "our").
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">3. User Accounts</h2>
              <p className="text-gray-300 leading-relaxed mb-4">
                When you create an account with us, you must provide information that is accurate, complete, and current at all times. Failure to do so constitutes a breach of the Terms, which may result in immediate termination of your account on our Service.
              </p>
              <p className="text-gray-300 leading-relaxed">
                You are responsible for safeguarding the password and for all activities that occur under your account.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">4. Subscription and Billing</h2>
              <p className="text-gray-300 leading-relaxed mb-4">
                Some parts of the Service are billed on a subscription basis ("Subscription(s)"). You will be billed in advance on a recurring and periodic basis ("Billing Cycle"). Billing cycles are set on a monthly or annual basis, depending on the type of subscription plan you select.
              </p>
              <p className="text-gray-300 leading-relaxed mb-4">
                At the end of each Billing Cycle, your Subscription will automatically renew under the exact same conditions unless you cancel it or Pixel Pilot cancels it.
              </p>
              <p className="text-gray-300 leading-relaxed">
                You may cancel your Subscription either through your online account management page or by contacting our customer support team.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">5. Fee Changes</h2>
              <p className="text-gray-300 leading-relaxed mb-4">
                Pixel Pilot, in its sole discretion and at any time, may modify the Subscription fees. Any fee change will become effective at the end of the then-current Billing Cycle.
              </p>
              <p className="text-gray-300 leading-relaxed">
                We will provide you with reasonable prior notice of any change in Subscription fees to give you an opportunity to terminate your Subscription before such change becomes effective.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">6. Refunds</h2>
              <p className="text-gray-300 leading-relaxed mb-4">
                Certain refund requests for Subscriptions may be considered by Pixel Pilot on a case-by-case basis and granted at the sole discretion of Pixel Pilot. Please refer to our Refund Policy for more information.
              </p>
              <p className="text-gray-300 leading-relaxed">
                Processed refunds, if any, will be credited to your original method of payment within 7-10 business days.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">7. Content Ownership</h2>
              <p className="text-gray-300 leading-relaxed mb-4">
                You retain all rights to the content and projects you create using Pixel Pilot. All code, designs, and other materials generated through the Service belong to you.
              </p>
              <p className="text-gray-300 leading-relaxed">
                By using the Service, you grant Pixel Pilot a limited license to store, process, and display your content solely for the purpose of providing the Service to you.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">8. Acceptable Use</h2>
              <p className="text-gray-300 leading-relaxed mb-4">
                You agree not to use the Service:
              </p>
              <ul className="list-disc list-inside text-gray-300 leading-relaxed space-y-2 ml-4">
                <li>For any unlawful purpose or to solicit others to perform unlawful acts</li>
                <li>To violate any international, federal, provincial, or state regulations, rules, laws, or local ordinances</li>
                <li>To infringe upon or violate our intellectual property rights or the intellectual property rights of others</li>
                <li>To harass, abuse, insult, harm, defame, slander, disparage, intimidate, or discriminate</li>
                <li>To submit false or misleading information</li>
                <li>To upload or transmit viruses or any other type of malicious code</li>
                <li>To spam, phish, pharm, pretext, spider, crawl, or scrape</li>
                <li>For any obscene or immoral purpose</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">9. Termination</h2>
              <p className="text-gray-300 leading-relaxed mb-4">
                We may terminate or suspend your account immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms.
              </p>
              <p className="text-gray-300 leading-relaxed">
                Upon termination, your right to use the Service will cease immediately. If you wish to terminate your account, you may simply discontinue using the Service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">10. Disclaimer</h2>
              <p className="text-gray-300 leading-relaxed mb-4">
                The information on this website is provided on an "as is" basis. To the fullest extent permitted by law, Pixel Pilot:
              </p>
              <ul className="list-disc list-inside text-gray-300 leading-relaxed space-y-2 ml-4">
                <li>Excludes all representations and warranties relating to this website and its contents</li>
                <li>Does not guarantee that the website will be constantly available, or available at all</li>
                <li>Does not guarantee that the information on this website is complete, true, accurate, or non-misleading</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">11. Limitation of Liability</h2>
              <p className="text-gray-300 leading-relaxed">
                In no event shall Pixel Pilot, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential, or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from your use of the Service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">12. Governing Law</h2>
              <p className="text-gray-300 leading-relaxed">
                These Terms shall be interpreted and governed by the laws of the jurisdiction in which Pixel Pilot operates, without regard to its conflict of law provisions.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">13. Changes to Terms</h2>
              <p className="text-gray-300 leading-relaxed">
                We reserve the right, at our sole discretion, to modify or replace these Terms at any time. If a revision is material, we will try to provide at least 30 days notice prior to any new terms taking effect.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">14. Contact Information</h2>
              <p className="text-gray-300 leading-relaxed">
                If you have any questions about these Terms & Conditions, please contact us at support@pipilot.dev or through our support channels.
              </p>
            </section>
          </div>
        </div>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  )
}
