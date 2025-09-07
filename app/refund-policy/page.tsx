"use client"

import { Navigation } from "@/components/navigation"
import { Footer } from "@/components/footer"
import { Logo } from "@/components/ui/logo"
import { Heart } from "lucide-react"

export default function RefundPolicyPage() {
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
              Refund Policy
            </h1>
            <p className="text-lg text-white/80">
              Last updated: January 2025
            </p>
          </div>

          {/* Refund Policy Content */}
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-8 space-y-8">
            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">1. Overview</h2>
              <p className="text-gray-300 leading-relaxed mb-4">
                At Pixel Pilot, we want you to be completely satisfied with our AI-powered web application development platform. This Refund Policy outlines the circumstances under which we provide refunds for our subscription services.
              </p>
              <p className="text-gray-300 leading-relaxed">
                All refund requests are evaluated on a case-by-case basis and granted at the sole discretion of Pixel Pilot.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">2. Subscription Refunds</h2>
              <h3 className="text-xl font-medium text-white mb-3">2.1 Monthly Subscriptions</h3>
              <p className="text-gray-300 leading-relaxed mb-4">
                For monthly subscription plans, you may request a refund within 14 days of your initial payment or subscription renewal. Refunds will be prorated based on the unused portion of your billing cycle.
              </p>

              <h3 className="text-xl font-medium text-white mb-3">2.2 Annual Subscriptions</h3>
              <p className="text-gray-300 leading-relaxed mb-4">
                For annual subscription plans, you may request a refund within 30 days of your initial payment. Refunds will be prorated based on the unused portion of your billing cycle, minus any applicable early termination fees.
              </p>

              <h3 className="text-xl font-medium text-white mb-3">2.3 Enterprise Plans</h3>
              <p className="text-gray-300 leading-relaxed mb-4">
                Enterprise subscription refunds are handled on a case-by-case basis. Please contact our sales team directly to discuss your specific circumstances and requirements.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">3. Eligible Refund Circumstances</h2>
              <p className="text-gray-300 leading-relaxed mb-4">
                Refunds may be considered in the following situations:
              </p>
              <ul className="list-disc list-inside text-gray-300 leading-relaxed space-y-2 ml-4">
                <li><strong>Service Unavailability:</strong> Extended periods where the service is unavailable due to technical issues</li>
                <li><strong>Billing Errors:</strong> Incorrect charges or duplicate billing</li>
                <li><strong>Technical Issues:</strong> Significant functionality problems that prevent normal use of the service</li>
                <li><strong>Account Issues:</strong> Problems with account setup or access that cannot be resolved</li>
                <li><strong>Dissatisfaction:</strong> General dissatisfaction with the service within the refund window</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">4. Non-Refundable Items</h2>
              <p className="text-gray-300 leading-relaxed mb-4">
                The following are generally not eligible for refunds:
              </p>
              <ul className="list-disc list-inside text-gray-300 leading-relaxed space-y-2 ml-4">
                <li>Credits or usage that have already been consumed</li>
                <li>Third-party integrations or add-on services</li>
                <li>Custom development work or consulting services</li>
                <li>Refunds requested after the applicable refund period has expired</li>
                <li>Accounts terminated due to violation of our Terms & Conditions</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">5. How to Request a Refund</h2>
              <p className="text-gray-300 leading-relaxed mb-4">
                To request a refund, please follow these steps:
              </p>
              <ol className="list-decimal list-inside text-gray-300 leading-relaxed space-y-2 ml-4">
                <li>Contact our support team at support@pixelpilot.dev</li>
                <li>Include your account email and subscription details</li>
                <li>Provide a clear explanation of the reason for your refund request</li>
                <li>Include any relevant screenshots or documentation</li>
              </ol>
              <p className="text-gray-300 leading-relaxed">
                We will acknowledge your request within 24 hours and aim to process eligible refunds within 7-10 business days.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">6. Refund Processing</h2>
              <p className="text-gray-300 leading-relaxed mb-4">
                Once a refund is approved:
              </p>
              <ul className="list-disc list-inside text-gray-300 leading-relaxed space-y-2 ml-4">
                <li>Refunds will be processed to your original payment method</li>
                <li>Processing time varies by payment provider (typically 3-10 business days)</li>
                <li>You will receive an email confirmation once the refund is processed</li>
                <li>Your account will be adjusted to reflect the refund</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">7. Subscription Cancellation</h2>
              <p className="text-gray-300 leading-relaxed mb-4">
                Cancellation of your subscription does not automatically trigger a refund. If you cancel your subscription:
              </p>
              <ul className="list-disc list-inside text-gray-300 leading-relaxed space-y-2 ml-4">
                <li>You will continue to have access to the service until the end of your current billing period</li>
                <li>You can request a refund for the unused portion within the refund window</li>
                <li>No refunds will be provided for partial months used</li>
                <li>You can reactivate your subscription at any time</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">8. Credit Adjustments</h2>
              <p className="text-gray-300 leading-relaxed mb-4">
                In some cases, instead of a monetary refund, we may offer:
              </p>
              <ul className="list-disc list-inside text-gray-300 leading-relaxed space-y-2 ml-4">
                <li>Account credits for future use</li>
                <li>Extended subscription periods</li>
                <li>Alternative service options</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">9. Free Trial Refunds</h2>
              <p className="text-gray-300 leading-relaxed mb-4">
                If you signed up for a free trial that automatically converts to a paid subscription:
              </p>
              <ul className="list-disc list-inside text-gray-300 leading-relaxed space-y-2 ml-4">
                <li>You must cancel before the trial ends to avoid being charged</li>
                <li>If you are accidentally charged, contact us immediately for a full refund</li>
                <li>Free trial periods are clearly disclosed during signup</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">10. Chargebacks</h2>
              <p className="text-gray-300 leading-relaxed mb-4">
                If you initiate a chargeback through your bank or credit card company:
              </p>
              <ul className="list-disc list-inside text-gray-300 leading-relaxed space-y-2 ml-4">
                <li>We will work with you to resolve the issue directly</li>
                <li>Unilateral chargebacks may result in account suspension</li>
                <li>We reserve the right to dispute chargebacks that violate this policy</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">11. Changes to This Policy</h2>
              <p className="text-gray-300 leading-relaxed mb-4">
                Pixel Pilot reserves the right to modify this Refund Policy at any time. Changes will be effective immediately upon posting on our website.
              </p>
              <p className="text-gray-300 leading-relaxed">
                We will notify users of significant changes via email or through our service notifications.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">12. Contact Information</h2>
              <p className="text-gray-300 leading-relaxed mb-4">
                If you have questions about this Refund Policy or need to request a refund, please contact us:
              </p>
              <div className="text-gray-300 leading-relaxed ml-4">
                <p><strong>Email:</strong> support@pixelpilot.dev</p>
                <p><strong>Subject:</strong> Refund Request</p>
                <p><strong>Response Time:</strong> Within 24 hours</p>
              </div>
            </section>
          </div>
        </div>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  )
}
