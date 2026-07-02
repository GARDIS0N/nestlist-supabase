import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Shield, Clock, FileText, CheckCircle2 } from "lucide-react";

export const Privacy: React.FC = () => {
  return (
    <div className="min-h-screen bg-stone-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Back Link and Header */}
        <div className="mb-8">
          <Link
            to="/"
            className="inline-flex items-center space-x-2 text-sm font-semibold text-amber-700 hover:text-amber-800 transition"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Browse</span>
          </Link>
        </div>

        {/* Hero Section */}
        <div className="bg-white rounded-3xl border border-stone-200 shadow-sm p-8 sm:p-12 mb-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 h-40 w-40 bg-amber-50 rounded-bl-full -z-10 opacity-60" />
          <div className="flex items-center space-x-3 mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 shadow-sm">
              <Shield className="h-6 w-6" />
            </div>
            <span className="text-xs font-bold text-amber-600 uppercase tracking-widest">
              Trust & Transparency
            </span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-sans font-black tracking-tight text-stone-950 mb-4">
            Nestlist Privacy Policy
          </h1>

          <div className="flex flex-wrap gap-4 text-xs font-mono text-stone-500">
            <div className="flex items-center space-x-1">
              <Clock className="h-3.5 w-3.5" />
              <span>Effective Date: July 1, 2026</span>
            </div>
            <div className="flex items-center space-x-1">
              <FileText className="h-3.5 w-3.5" />
              <span>Last Updated: July 1, 2026</span>
            </div>
          </div>

          <p className="mt-6 text-stone-600 leading-relaxed text-sm sm:text-base">
            Nestlist ("<strong>Nestlist</strong>," "<strong>we</strong>," "<strong>us</strong>," or "<strong>our</strong>") is committed to protecting the privacy and personal data of everyone who uses our platform. This Privacy Policy explains how we collect, use, disclose, store, and protect information when you access or use the Nestlist website, mobile applications (Android and iOS), admin dashboard, vendor dashboard, landlord dashboard, agent tools, and any related services (collectively, the "<strong>Platform</strong>" or "<strong>Services</strong>").
          </p>
          <p className="mt-3 text-stone-600 leading-relaxed text-sm sm:text-base">
            This Privacy Policy is designed to comply with the <strong>Kenya Data Protection Act, 2019</strong> and the <strong>Kenya Data Protection (General) Regulations, 2021</strong>, the <strong>EU General Data Protection Regulation ("GDPR")</strong>, the <strong>UK GDPR</strong>, the <strong>California Consumer Privacy Act / California Privacy Rights Act ("CCPA/CPRA")</strong> (where applicable), and the developer policies of <strong>Google Play</strong> and the <strong>Apple App Store</strong>.
          </p>
          <p className="mt-3 text-stone-600 leading-relaxed text-sm sm:text-base">
            By creating an account, accessing, or using Nestlist, you acknowledge that you have read, understood, and agree to the practices described in this Privacy Policy. If you do not agree with this Privacy Policy, you must not use the Platform.
          </p>
        </div>

        {/* Quick Nav / Table of Contents */}
        <div className="bg-stone-100 rounded-2xl border border-stone-200/60 p-6 mb-8">
          <h2 className="text-sm font-bold text-stone-800 uppercase tracking-wider mb-4 flex items-center space-x-2">
            <CheckCircle2 className="h-4 w-4 text-amber-600" />
            <span>Table of Contents</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-xs">
            <a href="#1-definitions" className="text-stone-600 hover:text-amber-700 transition font-medium">1. Definitions</a>
            <a href="#2-scope-and-application" className="text-stone-600 hover:text-amber-700 transition font-medium">2. Scope and Application</a>
            <a href="#3-who-we-are" className="text-stone-600 hover:text-amber-700 transition font-medium">3. Who We Are: Data Controller Information</a>
            <a href="#4-information-we-collect" className="text-stone-600 hover:text-amber-700 transition font-medium">4. Information We Collect</a>
            <a href="#5-how-we-collect" className="text-stone-600 hover:text-amber-700 transition font-medium">5. How We Collect Information</a>
            <a href="#6-why-we-collect" className="text-stone-600 hover:text-amber-700 transition font-medium">6. Why We Collect and How We Use Your Information</a>
            <a href="#7-legal-basis" className="text-stone-600 hover:text-amber-700 transition font-medium">7. Legal Basis for Processing</a>
            <a href="#8-ai-processing" className="text-stone-600 hover:text-amber-700 transition font-medium">8. AI Processing and Automated Decision-Making</a>
            <a href="#9-property-verification" className="text-stone-600 hover:text-amber-700 transition font-medium">9. Property Verification, KYC, and Identity Checks</a>
            <a href="#10-payments-financial" className="text-stone-600 hover:text-amber-700 transition font-medium">10. Payments and Financial Information</a>
            <a href="#11-sharing-disclosure" className="text-stone-600 hover:text-amber-700 transition font-medium">11. Sharing and Disclosure of Information</a>
            <a href="#12-third-party" className="text-stone-600 hover:text-amber-700 transition font-medium">12. Third-Party Integrations</a>
            <a href="#13-cookies-tracking" className="text-stone-600 hover:text-amber-700 transition font-medium">13. Cookies, Tracking Technologies, and Analytics</a>
            <a href="#14-notifications" className="text-stone-600 hover:text-amber-700 transition font-medium">14. Push, SMS, and Email Notifications</a>
            <a href="#15-data-security" className="text-stone-600 hover:text-amber-700 transition font-medium">15. Data Security</a>
            <a href="#16-fraud-prevention" className="text-stone-600 hover:text-amber-700 transition font-medium">16. Fraud Prevention and Security Monitoring</a>
            <a href="#17-data-retention" className="text-stone-600 hover:text-amber-700 transition font-medium">17. Data Retention</a>
            <a href="#18-international-transfers" className="text-stone-600 hover:text-amber-700 transition font-medium">18. International Data Transfers</a>
            <a href="#19-privacy-rights" className="text-stone-600 hover:text-amber-700 transition font-medium">19. Your Privacy Rights</a>
            <a href="#20-account-deletion" className="text-stone-600 hover:text-amber-700 transition font-medium">20. Account and Data Deletion</a>
            <a href="#21-childrens-privacy" className="text-stone-600 hover:text-amber-700 transition font-medium">21. Children's Privacy</a>
            <a href="#22-reviews-ratings" className="text-stone-600 hover:text-amber-700 transition font-medium">22. Reviews, Ratings, and Content</a>
            <a href="#23-referral-program" className="text-stone-600 hover:text-amber-700 transition font-medium">23. Referral Program and Loyalty Points</a>
            <a href="#24-mobile-app" className="text-stone-600 hover:text-amber-700 transition font-medium">24. Mobile App-Specific Disclosures</a>
            <a href="#25-complaints" className="text-stone-600 hover:text-amber-700 transition font-medium">25. Complaints Procedure</a>
            <a href="#26-changes-policy" className="text-stone-600 hover:text-amber-700 transition font-medium">26. Changes to This Privacy Policy</a>
            <a href="#27-liability-disclaimers" className="text-stone-600 hover:text-amber-700 transition font-medium">27. Limitation of Liability and Disclaimers</a>
            <a href="#28-contact-info" className="text-stone-600 hover:text-amber-700 transition font-medium">28. Contact Information</a>
            <a href="#29-acknowledgment" className="text-stone-600 hover:text-amber-700 transition font-medium">29. Acknowledgment and Consent</a>
          </div>
        </div>

        {/* Policy Content Sections */}
        <div className="bg-white rounded-3xl border border-stone-200 shadow-sm p-8 sm:p-12 space-y-10 text-stone-700 text-sm sm:text-base leading-relaxed">
          
          {/* Section 1 */}
          <section id="1-definitions" className="scroll-mt-20">
            <h2 className="text-xl font-bold text-stone-900 border-b border-stone-100 pb-2 mb-4">
              1. Definitions
            </h2>
            <p className="mb-3">For the purposes of this Privacy Policy, the following definitions apply:</p>
            <ul className="list-disc pl-5 space-y-2 text-stone-600">
              <li><strong>"Data Subject"</strong> means an identified or identifiable natural person to whom Personal Data relates, including Tenants, Landlords, Agents, Property Managers, and website visitors.</li>
              <li><strong>"Personal Data"</strong> means any information relating to an identified or identifiable natural person, consistent with the definition under Section 2 of the Kenya Data Protection Act, 2019 and Article 4(1) of the GDPR.</li>
              <li><strong>"Sensitive Personal Data"</strong> means data revealing an individual's race, health status, ethnic social origin, conscience, belief, genetic data, biometric data, property details, marital status, family details including names of children, parents, spouse(s), sexual orientation, financial details, or an individual's identification number, as defined under the Kenya Data Protection Act, 2019.</li>
              <li><strong>"Processing"</strong> means any operation performed on Personal Data, including collection, recording, organization, storage, adaptation, retrieval, use, disclosure, dissemination, or destruction.</li>
              <li><strong>"Data Controller"</strong> means Nestlist, which determines the purposes and means of Processing Personal Data.</li>
              <li><strong>"Data Processor"</strong> means any third party that processes Personal Data on behalf of Nestlist.</li>
              <li><strong>"User"</strong> means any person who accesses or uses the Platform, including Tenants, Landlords, Property Managers, and Agents.</li>
              <li><strong>"Tenant"</strong> means a User seeking to search, view, apply for, or rent a property listed on the Platform.</li>
              <li><strong>"Landlord"</strong> means a User who owns and lists property for rent or sale on the Platform.</li>
              <li><strong>"Agent"</strong> or <strong>"Property Manager"</strong> means a User authorized to list, manage, or market properties on behalf of a Landlord.</li>
              <li><strong>"Listing"</strong> means a property advertisement published on the Platform.</li>
              <li><strong>"KYC"</strong> means "Know Your Customer," referring to identity verification processes.</li>
              <li><strong>"Cookies"</strong> means small data files placed on a User's device, as further described in Section 13.</li>
            </ul>
          </section>

          {/* Section 2 */}
          <section id="2-scope-and-application" className="scroll-mt-20">
            <h2 className="text-xl font-bold text-stone-900 border-b border-stone-100 pb-2 mb-4">
              2. Scope and Application
            </h2>
            <p className="mb-3">This Privacy Policy applies to all Personal Data processed by Nestlist in connection with:</p>
            <ol className="list-decimal pl-5 space-y-1.5 text-stone-600">
              <li>The Nestlist website and any subdomains;</li>
              <li>The Nestlist mobile applications available on the Google Play Store and Apple App Store;</li>
              <li>The Nestlist Admin Dashboard, Vendor Dashboard, Landlord Dashboard, and Agent tools;</li>
              <li>Any customer support interactions, whether by email, phone, live chat, or WhatsApp;</li>
              <li>Any offline interactions connected to the Services, such as property verification visits.</li>
            </ol>
            <p className="mt-3">
              This Privacy Policy does <strong>not</strong> apply to third-party websites, applications, or services that may be linked to or integrated with the Platform, including but not limited to Google Maps, WhatsApp, and payment processors. We encourage Users to review the privacy policies of such third parties independently.
            </p>
          </section>

          {/* Section 3 */}
          <section id="3-who-we-are" className="scroll-mt-20">
            <h2 className="text-xl font-bold text-stone-900 border-b border-stone-100 pb-2 mb-4">
              3. Who We Are: Data Controller Information
            </h2>
            <p className="mb-3">
              Nestlist acts as the Data Controller in respect of Personal Data collected through the Platform for account management, listings, communications, and platform operations. Where Landlords, Agents, or Property Managers collect information about Tenants independently (for example, during in-person viewings), they may act as independent Data Controllers in their own right and are responsible for complying with applicable data protection laws in respect of such collection.
            </p>
            <div className="bg-stone-50 border border-stone-200 rounded-xl p-5 text-xs sm:text-sm text-stone-600 space-y-1.5 font-mono">
              <p><strong>Data Controller:</strong> Nestlist Platforms Limited</p>
              <p><strong>Registered Address:</strong> Nairobi, Kenya</p>
              <p><strong>Data Protection Officer Email:</strong> privacy@nestlist.co.ke</p>
              <p><strong>Registration status:</strong> Registered with the Office of the Data Protection Commissioner (ODPC), Kenya, in accordance with Section 18 of the Kenya Data Protection Act, 2019.</p>
            </div>
          </section>

          {/* Section 4 */}
          <section id="4-information-we-collect" className="scroll-mt-20">
            <h2 className="text-xl font-bold text-stone-900 border-b border-stone-100 pb-2 mb-4">
              4. Information We Collect
            </h2>
            <p className="mb-3">We collect several categories of information depending on how you interact with the Platform and the role you hold.</p>
            
            <div className="space-y-4">
              <div>
                <h3 className="font-bold text-stone-850 text-sm uppercase tracking-wider mb-1">4.1 Identity and Contact Information</h3>
                <p className="text-stone-650">Full name, email address, phone number, password (stored in encrypted/hashed form), profile photograph, date of birth (where required for verification), physical or postal address.</p>
              </div>
              <div>
                <h3 className="font-bold text-stone-850 text-sm uppercase tracking-wider mb-1">4.2 Government Identification and KYC Information</h3>
                <p className="text-stone-650">National ID number, passport number, or alien ID number, KRA PIN (where applicable), business registration and licensing documents, selfie or liveness-check images, proof of property ownership (e.g., title deeds, lease agreements, letters of authority).</p>
              </div>
              <div>
                <h3 className="font-bold text-stone-850 text-sm uppercase tracking-wider mb-1">4.3 Business and Professional Information</h3>
                <p className="text-stone-650">Business name, registration number, and address; agency license or professional accreditation details; bank account or mobile money details for receiving payments (Agents, Landlords, and Property Managers).</p>
              </div>
              <div>
                <h3 className="font-bold text-stone-850 text-sm uppercase tracking-wider mb-1">4.4 Property Information</h3>
                <p className="text-stone-650">Property address and GPS coordinates, property type, size, amenities, and pricing, photographs, videos, and virtual tour content, verification status and history.</p>
              </div>
              <div>
                <h3 className="font-bold text-stone-850 text-sm uppercase tracking-wider mb-1">4.5 Rental Application and Transaction Information</h3>
                <p className="text-stone-650">Rental application details (including employment and income information voluntarily submitted by Tenants), references, booking and visit scheduling information, subscription and featured listing payment history.</p>
              </div>
              <div>
                <h3 className="font-bold text-stone-850 text-sm uppercase tracking-wider mb-1">4.6 Payment Information</h3>
                <p className="text-stone-650">M-Pesa transaction details (phone number, transaction ID, amount), Airtel Money transaction details, card details (processed exclusively through PCI-DSS-compliant third-party payment processors; Nestlist does not store full card numbers), bank transfer details.</p>
              </div>
              <div>
                <h3 className="font-bold text-stone-850 text-sm uppercase tracking-wider mb-1">4.7 Communications Data</h3>
                <p className="text-stone-650">Messages exchanged between Tenants, Landlords, and Agents through in-platform messaging; live chat transcripts; WhatsApp messages sent through our WhatsApp Business integration; customer support correspondence.</p>
              </div>
              <div>
                <h3 className="font-bold text-stone-850 text-sm uppercase tracking-wider mb-1">4.8 Technical and Device Information</h3>
                <p className="text-stone-650">IP address, device type, model, operating system, browser type and version, device identifiers (e.g., Advertising ID, IDFA, GAID), app version, and GPS or approximate location data (where permission is granted).</p>
              </div>
              <div>
                <h3 className="font-bold text-stone-850 text-sm uppercase tracking-wider mb-1">4.9 Usage and Analytics Information</h3>
                <p className="text-stone-650">Search history, search filters, saved searches, saved/favorited properties, pages visited, features used, time spent on the Platform, and referral source.</p>
              </div>
              <div>
                <h3 className="font-bold text-stone-850 text-sm uppercase tracking-wider mb-1">4.10 User-Generated Content</h3>
                <p className="text-stone-650">Reviews and ratings of properties, Landlords, or Agents; reported issues, complaints, and fraud reports.</p>
              </div>
              <div>
                <h3 className="font-bold text-stone-850 text-sm uppercase tracking-wider mb-1">4.11 Marketing Preferences</h3>
                <p className="text-stone-650">Communication and marketing opt-in/opt-out preferences; language and notification preferences.</p>
              </div>
            </div>
            <p className="mt-4 text-xs text-stone-500 italic">
              We aim to collect only the information that is reasonably necessary to provide and improve our Services, consistent with the data minimization principle under Section 25 of the Kenya Data Protection Act, 2019 and Article 5(1)(c) GDPR.
            </p>
          </section>

          {/* Section 5 */}
          <section id="5-how-we-collect" className="scroll-mt-20">
            <h2 className="text-xl font-bold text-stone-900 border-b border-stone-100 pb-2 mb-4">
              5. How We Collect Information
            </h2>
            <p className="mb-3">We collect information in the following ways:</p>
            <ul className="list-disc pl-5 space-y-2 text-stone-650">
              <li><strong>Directly from you</strong> — when you register an account, complete your profile, list a property, submit a rental application, upload documents, make a payment, contact support, or otherwise interact with the Platform.</li>
              <li><strong>Automatically</strong> — through cookies, SDKs, and similar tracking technologies when you use our website or mobile apps, including device information, IP address, location data, and usage analytics.</li>
              <li><strong>From third parties</strong> — including identity verification providers, payment processors (Safaricom M-Pesa, Airtel Money, card processors, banks), Google (for Maps and sign-in), and publicly available registries.</li>
              <li><strong>From other Users</strong> — for example, when a Landlord or Agent uploads information about a property or when a reference is submitted in connection with a rental application.</li>
            </ul>
          </section>

          {/* Section 6 */}
          <section id="6-why-we-collect" className="scroll-mt-20">
            <h2 className="text-xl font-bold text-stone-900 border-b border-stone-100 pb-2 mb-4">
              6. Why We Collect and How We Use Your Information
            </h2>
            <p className="mb-3">We use the collected information for the following specific purposes:</p>
            <ul className="list-disc pl-5 space-y-1.5 text-stone-650">
              <li><strong>Account creation and management</strong> — to register, authenticate, and manage User accounts across Tenant, Landlord, Agent, and Property Manager roles.</li>
              <li><strong>Listing and search functionality</strong> — to publish, display, and enable search and discovery of property listings, including AI-powered and map-based search.</li>
              <li><strong>Communication facilitation</strong> — to enable messaging, live chat, and notifications between Users, and between Users and Nestlist.</li>
              <li><strong>Property verification</strong> — to confirm the authenticity of listings and the identity/authority of Landlords and Agents.</li>
              <li><strong>Payment processing</strong> — to process subscription fees, featured listing fees, and other payments via M-Pesa, Airtel Money, card, or bank transfer, and to maintain transaction records.</li>
              <li><strong>Rental applications and bookings</strong> — to facilitate applications for rental properties and scheduling of property visits.</li>
              <li><strong>Personalization</strong> — to power AI-driven property recommendations, personalized search results, and saved search alerts.</li>
              <li><strong>Customer support</strong> — to respond to inquiries, resolve disputes, and provide technical assistance.</li>
              <li><strong>Fraud prevention and security</strong> — to detect, investigate, and prevent fraudulent listings, fake accounts, scams, and unauthorized access.</li>
              <li><strong>Analytics and platform improvement</strong> — to understand usage patterns, diagnose technical issues, and improve features and performance.</li>
              <li><strong>Marketing communications</strong> — to send promotional content, newsletters, referral program updates, and loyalty point notifications, subject to your consent and opt-out rights.</li>
              <li><strong>Legal compliance</strong> — to comply with applicable laws, regulatory requests, tax obligations, and law enforcement requirements.</li>
            </ul>
          </section>

          {/* Section 7 */}
          <section id="7-legal-basis" className="scroll-mt-20">
            <h2 className="text-xl font-bold text-stone-900 border-b border-stone-100 pb-2 mb-4">
              7. Legal Basis for Processing
            </h2>
            <p className="mb-3">We rely on the following legal bases to process Personal Data:</p>
            <ul className="list-disc pl-5 space-y-2 text-stone-650">
              <li><strong>Consent</strong> — for optional features such as marketing communications, push notifications, precise location tracking, and certain cookies. You may withdraw consent at any time.</li>
              <li><strong>Performance of a contract</strong> — where processing is necessary to provide the Services you have requested, such as creating an account, publishing a listing, or processing a payment.</li>
              <li><strong>Legal obligation</strong> — where processing is required to comply with Kenyan tax law, anti-money laundering requirements, or other statutory obligations.</li>
              <li><strong>Legitimate interests</strong> — where processing is necessary for purposes such as fraud prevention, platform security, service improvement, and direct marketing to existing Users.</li>
            </ul>
          </section>

          {/* Section 8 */}
          <section id="8-ai-processing" className="scroll-mt-20">
            <h2 className="text-xl font-bold text-stone-900 border-b border-stone-100 pb-2 mb-4">
              8. Artificial Intelligence Processing and Automated Decision-Making
            </h2>
            <p className="mb-3">
              8.1. Nestlist uses artificial intelligence and machine learning technologies to power certain features, including:
            </p>
            <ul className="list-disc pl-5 space-y-1 mb-3 text-stone-650">
              <li>AI-powered property recommendations based on your search history, saved properties, and stated preferences;</li>
              <li>AI-assisted search that interprets natural-language queries;</li>
              <li>Fraud and duplicate-listing detection systems;</li>
              <li>Automated flagging of potentially fraudulent user reports or suspicious account activity.</li>
            </ul>
            <p className="mb-3">
              8.2. <strong>Nature of automated processing.</strong> These systems analyze patterns in your usage data (such as search filters, favorited properties, and location preferences) to generate personalized suggestions. Recommendation outputs are advisory in nature and do not produce legal or similarly significant effects on you without the opportunity for human review.
            </p>
            <p className="mb-3">
              8.3. <strong>Fraud detection systems</strong> may generate automated risk scores that flag accounts or listings for further human review. Any decision to suspend, restrict, or remove an account or listing based on such flags is subject to review by Nestlist's Trust & Safety team. Affected Users may contact us to request human review of such a decision.
            </p>
            <p className="mb-3">
              8.4. <strong>Opting out.</strong> Where AI-powered recommendations are based on optional profiling, you may adjust your preferences in your account settings or contact us to request that such profiling be limited.
            </p>
            <p>
              8.5. We do not use AI systems to make solely automated decisions that produce legal effects concerning tenancy approval; rental application decisions remain the responsibility of the relevant Landlord or Agent.
            </p>
          </section>

          {/* Section 9 */}
          <section id="9-property-verification" className="scroll-mt-20">
            <h2 className="text-xl font-bold text-stone-900 border-b border-stone-100 pb-2 mb-4">
              9. Property Verification, KYC, and Identity Checks
            </h2>
            <p className="mb-3">
              9.1. To promote trust and safety, Nestlist operates a property and identity verification program. Landlords and Agents may be required to submit government identification, proof of property ownership or management authority, and business registration documents.
            </p>
            <p className="mb-3">
              9.2. Verification information is processed by our internal Trust & Safety team and, where applicable, by third-party identity verification providers acting as Data Processors under contractual data protection obligations.
            </p>
            <p className="mb-3">
              9.3. Verification badges displayed on listings indicate that certain checks have been completed but do not constitute a guarantee or warranty by Nestlist as to the accuracy of the information provided, the legal title of the property, or the trustworthiness of the Landlord or Agent.
            </p>
            <p>
              9.4. Identification documents are stored securely, encrypted at rest, and accessible only to authorized personnel and our verification service providers.
            </p>
          </section>

          {/* Section 10 */}
          <section id="10-payments-financial" className="scroll-mt-20">
            <h2 className="text-xl font-bold text-stone-900 border-b border-stone-100 pb-2 mb-4">
              10. Payments and Financial Information
            </h2>
            <p className="mb-3">
              10.1. Nestlist supports payments via <strong>M-Pesa</strong>, <strong>Airtel Money</strong>, <strong>card payments</strong>, and <strong>bank transfers</strong>, processed through licensed and regulated third-party payment service providers.
            </p>
            <p className="mb-3">
              10.2. We do <strong>not</strong> store full card numbers, CVV codes, or M-Pesa/Airtel Money PINs. Card transactions are processed through PCI-DSS-compliant payment gateways, and mobile money transactions are processed through the respective telecommunications operators' secure APIs.
            </p>
            <p className="mb-3">
              10.3. We retain transaction metadata (such as transaction ID, amount, date, and payment status) for accounting, tax, dispute resolution, and fraud-prevention purposes, consistent with applicable financial recordkeeping laws in Kenya.
            </p>
            <p>
              10.4. Nestlist is not a party to, and assumes no liability for, rental payments, deposits, or other financial arrangements made directly between Tenants and Landlords outside of designated in-platform payment features.
            </p>
          </section>

          {/* Section 11 */}
          <section id="11-sharing-disclosure" className="scroll-mt-20">
            <h2 className="text-xl font-bold text-stone-900 border-b border-stone-100 pb-2 mb-4">
              11. Sharing and Disclosure of Information
            </h2>
            <p className="mb-3">We do not sell your Personal Data. We may share information in the following circumstances:</p>
            <ul className="list-disc pl-5 space-y-1.5 text-stone-650">
              <li><strong>Between Users, as necessary to facilitate transactions:</strong> A Tenant's application details may be shared with the relevant Landlord or Agent, and a Landlord's contact and listing information may be visible to Tenants who inquire about a property.</li>
              <li><strong>With service providers and processors:</strong> Including cloud hosting providers, payment processors, SMS and email delivery providers, identity verification vendors, and analytics providers.</li>
              <li><strong>With professional advisors:</strong> Such as legal counsel, auditors, and insurers, where necessary for our legitimate business operations.</li>
              <li><strong>With regulators and law enforcement:</strong> Where required by Kenyan law, court order, or to comply with legal process, or to protect the rights, property, or safety of Nestlist, our Users, or the public.</li>
              <li><strong>In connection with a corporate transaction:</strong> Such as a merger, acquisition, financing, or sale of assets, subject to appropriate confidentiality safeguards.</li>
              <li><strong>With your consent:</strong> For any other purpose disclosed to you at the time of collection.</li>
            </ul>
          </section>

          {/* Section 12 */}
          <section id="12-third-party" className="scroll-mt-20">
            <h2 className="text-xl font-bold text-stone-900 border-b border-stone-100 pb-2 mb-4">
              12. Third-Party Integrations
            </h2>
            <p className="mb-3">The Platform integrates with third-party services which may independently process your data subject to their own privacy policies:</p>
            <ul className="list-disc pl-5 space-y-1.5 text-stone-650">
              <li><strong>Payment Processors</strong> — Safaricom M-Pesa Daraja API, Airtel Money, bank transfer APIs.</li>
              <li><strong>Cloud Hosting Providers</strong> — for secure database storage and backups.</li>
              <li><strong>Google Maps Platform</strong> — for displaying property locations and enabling map-based search.</li>
              <li><strong>WhatsApp Business Platform (Meta)</strong> — for enabling communications between Users and Nestlist.</li>
              <li><strong>SMS & Email Gateways</strong> — Africa's Talking, Twilio, Resend, or other transactional delivery networks.</li>
              <li><strong>Identity Verification Providers</strong> — for document verification.</li>
            </ul>
          </section>

          {/* Section 13 */}
          <section id="13-cookies-tracking" className="scroll-mt-20">
            <h2 className="text-xl font-bold text-stone-900 border-b border-stone-100 pb-2 mb-4">
              13. Cookies, Tracking Technologies, and Analytics
            </h2>
            <p className="mb-3">
              13.1. Nestlist uses cookies, SDKs, and similar tracking technologies on our website and mobile applications to enable core functionality, remember preferences, analyze usage, and support fraud detection.
            </p>
            <p className="mb-3">
              13.2. <strong>Categories of cookies used:</strong>
            </p>
            <div className="overflow-x-auto mb-3">
              <table className="min-w-full text-xs sm:text-sm border border-stone-200">
                <thead>
                  <tr className="bg-stone-100 border-b border-stone-200">
                    <th className="px-4 py-2 text-left font-bold text-stone-700">Category</th>
                    <th className="px-4 py-2 text-left font-bold text-stone-700">Purpose</th>
                    <th className="px-4 py-2 text-left font-bold text-stone-700">Can be disabled?</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-stone-100">
                    <td className="px-4 py-2 font-bold text-stone-800">Strictly Necessary</td>
                    <td className="px-4 py-2">Session management, authentication, security checks</td>
                    <td className="px-4 py-2 text-stone-500">No</td>
                  </tr>
                  <tr className="border-b border-stone-100">
                    <td className="px-4 py-2 font-bold text-stone-800">Functional</td>
                    <td className="px-4 py-2">Remembering preferences, theme preferences, and saved searches</td>
                    <td className="px-4 py-2 text-green-600">Yes</td>
                  </tr>
                  <tr className="border-b border-stone-100">
                    <td className="px-4 py-2 font-bold text-stone-800">Analytics</td>
                    <td className="px-4 py-2">Understanding traffic patterns, performance testing, and user journeys</td>
                    <td className="px-4 py-2 text-green-600">Yes</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p>
              13.3. You may manage cookie preferences through your browser settings or device settings at any time. Disabling certain cookies may limit specific features.
            </p>
          </section>

          {/* Section 14 */}
          <section id="14-notifications" className="scroll-mt-20">
            <h2 className="text-xl font-bold text-stone-900 border-b border-stone-100 pb-2 mb-4">
              14. Push, SMS, and Email Notifications; Marketing Communications
            </h2>
            <p className="mb-3">
              14.1. We send <strong>transactional notifications</strong> (e.g., account verification, payment confirmations, application status updates, security alerts) via push notification, SMS, and email. These cannot be opted out of while maintaining an active account.
            </p>
            <p className="mb-3">
              14.2. We send <strong>marketing communications</strong> (e.g., promotions, new feature announcements, referral program updates) via push, SMS, email, and WhatsApp only where you have opted in.
            </p>
            <p>
              14.3. You may opt out of marketing communications at any time by using the "unsubscribe" link in emails, adjusting notification settings within the app, replying "STOP" to SMS, or contacting us.
            </p>
          </section>

          {/* Section 15 */}
          <section id="15-data-security" className="scroll-mt-20">
            <h2 className="text-xl font-bold text-stone-900 border-b border-stone-100 pb-2 mb-4">
              15. Data Security
            </h2>
            <p className="mb-3">
              15.1. We implement technical and organizational measures designed to protect Personal Data against unauthorized access, alteration, disclosure, or destruction, consistent with Section 41 of the Kenya Data Protection Act, 2019 and Article 32 GDPR. These include encryption of data in transit (TLS) and at rest, password hashing, and role-based access controls.
            </p>
            <p className="mb-3">
              15.2. While we take reasonable and industry-standard measures to protect your data, <strong>no method of electronic transmission or storage is completely secure</strong>, and we cannot guarantee absolute security.
            </p>
            <p>
              15.3. In the event of a data breach likely to result in a risk to your rights and freedoms, we will notify the Office of the Data Protection Commissioner and affected Users without undue delay, in accordance with Section 43 of the Kenya Data Protection Act, 2019.
            </p>
          </section>

          {/* Section 16 */}
          <section id="16-fraud-prevention" className="scroll-mt-20">
            <h2 className="text-xl font-bold text-stone-900 border-b border-stone-100 pb-2 mb-4">
              16. Fraud Prevention and Security Monitoring
            </h2>
            <p className="mb-3">
              16.1. We employ automated and manual fraud detection systems to identify fake listings, fraudulent accounts, phishing attempts, and payment fraud. These systems analyze account behavior, device fingerprints, and listing patterns.
            </p>
            <p>
              16.2. We encourage Users to submit reports of suspected fraudulent listings or scam attempts through the in-app reporting feature. We review reports and may suspend or terminate accounts found to be in violation of our terms.
            </p>
          </section>

          {/* Section 17 */}
          <section id="17-data-retention" className="scroll-mt-20">
            <h2 className="text-xl font-bold text-stone-900 border-b border-stone-100 pb-2 mb-4">
              17. Data Retention
            </h2>
            <p className="mb-3">
              17.1. We retain Personal Data only for as long as necessary to fulfill the purposes described, including to satisfy legal, accounting, tax, or regulatory requirements.
            </p>
            <p className="mb-3">
              17.2. <strong>Indicative retention periods:</strong>
            </p>
            <ul className="list-disc pl-5 space-y-1 mb-3 text-stone-650">
              <li><strong>Account profile:</strong> Duration of account plus 24 months.</li>
              <li><strong>KYC and IDs:</strong> 7 years from account closure, or as required by law.</li>
              <li><strong>Transaction records:</strong> 7 years, consistent with Kenyan tax obligations.</li>
              <li><strong>In-app communications:</strong> 24 months from last activity.</li>
            </ul>
          </section>

          {/* Section 18 */}
          <section id="18-international-transfers" className="scroll-mt-20">
            <h2 className="text-xl font-bold text-stone-900 border-b border-stone-100 pb-2 mb-4">
              18. International Data Transfers
            </h2>
            <p className="mb-3">
              18.1. Nestlist primarily stores and processes data within Kenya or in jurisdictions offering adequate data protection safeguards.
            </p>
            <p>
              18.2. Where Personal Data is transferred outside Kenya, we ensure such transfers comply with Section 48 of the Kenya Data Protection Act, 2019, ensuring the recipient country has adequate data protection safeguards, or using appropriate contractual safeguards (such as standard contractual clauses).
            </p>
          </section>

          {/* Section 19 */}
          <section id="19-privacy-rights" className="scroll-mt-20">
            <h2 className="text-xl font-bold text-stone-900 border-b border-stone-100 pb-2 mb-4">
              19. Your Privacy Rights
            </h2>
            <p className="mb-3">Depending on your location and applicable law, you may have the following rights in respect of your Personal Data:</p>
            
            <div className="space-y-3 pl-4 border-l-2 border-amber-500 my-4 text-stone-650">
              <p><strong>Under the Kenya Data Protection Act, 2019:</strong> Right to be informed of the use of data, right of access, right to object, right to correction/rectification, right to erasure of false or unlawfully obtained data, right to portability, and right to lodge a complaint with the ODPC.</p>
              <p><strong>Under the GDPR / UK GDPR:</strong> Right of access (Art 15), rectification (Art 16), erasure (Art 17), restriction (Art 18), portability (Art 20), objection (Art 21), and rights related to automated decisions (Art 22).</p>
            </div>
            <p>
              To exercise any of these rights, please contact our Data Protection Officer at <strong>privacy@nestlist.co.ke</strong>. We will respond to verified requests within the required timeframes.
            </p>
          </section>

          {/* Section 20 */}
          <section id="20-account-deletion" className="scroll-mt-20">
            <h2 className="text-xl font-bold text-stone-900 border-b border-stone-100 pb-2 mb-4">
              20. Account and Data Deletion
            </h2>
            <p className="mb-3">
              20.1. You may request deletion of your Nestlist account at any time via the account settings menu or by emailing our support team.
            </p>
            <p className="mb-3">
              20.2. Upon account deletion, we will delete or anonymize your Personal Data within a reasonable period, except where retention is required by law, to resolve disputes, or to prevent fraud.
            </p>
            <p>
              20.3. Reviews you have posted or messages sent to other Users may remain visible in an anonymized or "Deleted User" format, unless removal is legally required.
            </p>
          </section>

          {/* Section 21 */}
          <section id="21-childrens-privacy" className="scroll-mt-20">
            <h2 className="text-xl font-bold text-stone-900 border-b border-stone-100 pb-2 mb-4">
              21. Children's Privacy
            </h2>
            <p className="mb-3">
              21.1. Nestlist is intended for use by individuals who are at least 18 years old. We do not knowingly collect Personal Data from children.
            </p>
            <p>
              21.2. If we become aware that we have inadvertently collected Personal Data from a minor without parental consent, we will take steps to delete such information promptly.
            </p>
          </section>

          {/* Section 22 */}
          <section id="22-reviews-ratings" className="scroll-mt-20">
            <h2 className="text-xl font-bold text-stone-900 border-b border-stone-100 pb-2 mb-4">
              22. Reviews, Ratings, and User-Generated Content
            </h2>
            <p className="mb-3">
              22.1. Nestlist enables Users to submit reviews, ratings, and feedback regarding properties, Landlords, and Agents. Content submitted through these features may be publicly visible on the Platform.
            </p>
            <p>
              22.2. Please exercise discretion when submitting reviews, as such content may include Personal Data that becomes publicly accessible.
            </p>
          </section>

          {/* Section 23 */}
          <section id="23-referral-program" className="scroll-mt-20">
            <h2 className="text-xl font-bold text-stone-900 border-b border-stone-100 pb-2 mb-4">
              23. Referral Program and Loyalty Points
            </h2>
            <p className="mb-3">
              23.1. Where you participate in Nestlist's referral program, we may collect information about the individuals you refer, including their name and contact details, for tracking rewards.
            </p>
            <p>
              23.2. Loyalty points and referral activity are tied to your account and used to calculate eligibility for rewards, discounts, or premium features.
            </p>
          </section>

          {/* Section 24 */}
          <section id="24-mobile-app" className="scroll-mt-20">
            <h2 className="text-xl font-bold text-stone-900 border-b border-stone-100 pb-2 mb-4">
              24. Mobile App-Specific Disclosures (Google Play / Apple App Store)
            </h2>
            <p className="mb-3">
              24.1. In accordance with Google Play's Data Safety and Apple's App Store Privacy nutrition labels, we disclose the categories of data collected and whether data is shared in the respective app store listings.
            </p>
            <p className="mb-3">
              24.2. Our mobile applications may request permissions such as Location, Camera, Notifications, and Storage. You may manage or revoke these permissions in your device settings.
            </p>
            <p>
              24.3. Crash reporting tools collect technical diagnostic data to help us identify and resolve technical issues.
            </p>
          </section>

          {/* Section 25 */}
          <section id="25-complaints" className="scroll-mt-20">
            <h2 className="text-xl font-bold text-stone-900 border-b border-stone-100 pb-2 mb-4">
              25. Complaints Procedure
            </h2>
            <p className="mb-3">
              25.1. If you have concerns about how we process your Personal Data, please contact us first so we may investigate and resolve your concern.
            </p>
            <p className="mb-3">
              25.2. If you are not satisfied with our response, you have the right to lodge a complaint with:
            </p>
            <p className="font-bold text-stone-900">
              The Office of the Data Protection Commissioner (ODPC), Kenya
            </p>
            <p className="text-sm font-mono text-stone-500 mt-1">
              Website: www.odpc.go.ke
            </p>
          </section>

          {/* Section 26 */}
          <section id="26-changes-policy" className="scroll-mt-20">
            <h2 className="text-xl font-bold text-stone-900 border-b border-stone-100 pb-2 mb-4">
              26. Changes to This Privacy Policy
            </h2>
            <p className="mb-3">
              26.1. We may update this Privacy Policy from time to time to reflect changes in our practices, technology, legal requirements, or for other operational reasons.
            </p>
            <p>
              26.2. Where changes are material, we will provide notice through the Platform or by email prior to the changes taking effect. Continued use of the Platform after changes take effect constitutes acceptance.
            </p>
          </section>

          {/* Section 27 */}
          <section id="27-liability-disclaimers" className="scroll-mt-20">
            <h2 className="text-xl font-bold text-stone-900 border-b border-stone-100 pb-2 mb-4">
              27. Limitation of Liability and Disclaimers
            </h2>
            <p className="mb-3">
              27.1. Nestlist acts as a marketplace facilitating connections between Tenants, Landlords, Property Managers, and Agents. We do not own, manage, or guarantee the accuracy of property listings, and we are not a party to any tenancy, lease, or sale agreement entered into between Users.
            </p>
            <p className="mb-3">
              27.2. While we implement verification processes and fraud-prevention measures, Nestlist does not guarantee that all listings or User identities are accurate or free from fraud.
            </p>
            <p>
              27.3. To the maximum extent permitted by applicable law, Nestlist shall not be liable for any indirect, incidental, consequential, or punitive damages arising from your use of the Platform, except where such liability cannot be excluded under Kenyan law or other applicable mandatory law.
            </p>
          </section>

          {/* Section 28 */}
          <section id="28-contact-info" className="scroll-mt-20">
            <h2 className="text-xl font-bold text-stone-900 border-b border-stone-100 pb-2 mb-4">
              28. Contact Information
            </h2>
            <p className="mb-3">
              If you have any questions, concerns, or requests regarding this Privacy Policy or our data processing practices, please contact us at:
            </p>
            <div className="bg-stone-50 border border-stone-200 rounded-xl p-5 text-xs sm:text-sm text-stone-600 space-y-1.5 font-mono">
              <p className="font-bold text-stone-850">Nestlist Data Protection Office</p>
              <p>Email: privacy@nestlist.co.ke</p>
              <p>Phone: +254 700 000000</p>
              <p>Address: Nairobi, Kenya</p>
            </div>
          </section>

          {/* Section 29 */}
          <section id="29-acknowledgment" className="scroll-mt-20">
            <h2 className="text-xl font-bold text-stone-900 border-b border-stone-100 pb-2 mb-4">
              29. Acknowledgment and Consent
            </h2>
            <p className="mb-4">
              By creating an account, accessing, or otherwise using Nestlist's website, mobile applications, or any related Services, you acknowledge that you have read and understood this Privacy Policy and consent to the collection, use, disclosure, and processing of your Personal Data as described herein. If you do not agree to this Privacy Policy, you must discontinue use of the Platform immediately.
            </p>
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-center text-stone-700">
              <p className="font-semibold text-amber-900 mb-1">
                Thank you for choosing Nestlist
              </p>
              <p className="text-xs text-stone-500">
                We are proud to serve and connect communities across Kenya with secure, transparent, and modern property technology.
              </p>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
};
