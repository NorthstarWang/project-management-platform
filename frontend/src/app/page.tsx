'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { Separator } from '@/components/ui/Separator';
import { motion, AnimatePresence } from 'framer-motion';
import BackgroundWrapper from '@/components/ui/BackgroundWrapper';
import { 
  Zap, 
  Users, 
  Calendar, 
  BarChart3, 
  Shield,
  ArrowRight, 
  CheckCircle,
  Star,
  Menu,
  X,
  Target,
  MessageCircle
} from 'lucide-react';

// Header Component
function LandingHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navigation = [
    { name: 'Features', href: '#features' },
    { name: 'Testimonials', href: '#testimonials' },
    { name: 'Pricing', href: '#pricing' },
    { name: 'About', href: '#about' }
  ];

  return (
    <header className="sticky top-0 z-50 w-full bg-background-glass backdrop-blur-xl border-b gradient-border">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center space-x-2">
            <div className="flex items-center justify-center w-8 h-8 bg-interactive-primary rounded-lg">
              <Zap className="h-5 w-5 text-on-accent" />
            </div>
            <span className="text-xl font-bold text-primary">Hub</span>
            <Badge variant="secondary" size="sm" className="hidden sm:inline-flex bg-background-glass text-accent gradient-border backdrop-blur-md">Beta</Badge>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            {navigation.map((item) => (
              <a
                key={item.name}
                href={item.href}
                className="text-secondary hover:text-primary transition-colors duration-200 font-medium"
              >
                {item.name}
              </a>
            ))}
          </nav>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center space-x-4">
            <ThemeToggle />
            <Link href="/login">
              <Button variant="ghost" size="sm" className="hover:scale-100">
                <span className="hover:scale-105 transition-transform">Sign In</span>
              </Button>
            </Link>
            <Link href="/register">
              <Button size="sm" className="hover:scale-100">
                <span className="hover:scale-105 transition-transform">Get Started</span>
              </Button>
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center space-x-2">
            <ThemeToggle />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div 
              className="md:hidden"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
            >
              <motion.div 
                className="px-2 pt-2 pb-3 space-y-1 bg-secondary rounded-lg mt-2 mb-4"
                initial={{ y: -10 }}
                animate={{ y: 0 }}
                exit={{ y: -10 }}
                transition={{ duration: 0.2 }}
              >
                {navigation.map((item, index) => (
                  <motion.a
                    key={item.name}
                    href={item.href}
                    className="block px-3 py-2 text-secondary hover:text-primary transition-colors duration-200"
                    onClick={() => setMobileMenuOpen(false)}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    {item.name}
                  </motion.a>
                ))}
                <Separator className="my-2" />
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: navigation.length * 0.05 }}
                >
                  <Link href="/login" className="block px-3 py-2">
                    <Button variant="ghost" size="sm" className="w-full justify-start hover:scale-100">
                      <span className="hover:scale-105 transition-transform">Sign In</span>
                    </Button>
                  </Link>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: (navigation.length + 1) * 0.05 }}
                >
                  <Link href="/register" className="block px-3 py-2">
                    <Button size="sm" className="w-full hover:scale-100">
                      <span className="hover:scale-105 transition-transform">Get Started</span>
                    </Button>
                  </Link>
                </motion.div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
}

// Hero Section
function HeroSection() {
  return (
    <section className="relative px-4 sm:px-6 lg:px-8 py-20 lg:py-32 bg-transparent backdrop-blur-sm">
      {/* Subtle overlay for better text contrast */}
      <div className="absolute inset-0 bg-gradient-to-b from-background-primary/20 via-transparent to-background-primary/30 pointer-events-none" />
      <div className="container mx-auto text-center relative z-10">
        <div className="max-w-4xl mx-auto">
          <Badge variant="outline" className="mb-6 bg-accent-10 border-accent-20 text-accent">
            <Star className="w-3 h-3 mr-1" />
            Trusted by 10,000+ teams worldwide
          </Badge>
          
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-primary mb-6 leading-tight">
            Where your teams and 
            <span className="text-accent"> AI coordinate</span>
            <br />work together
          </h1>
          
          <p className="text-xl sm:text-2xl text-secondary mb-8 max-w-3xl mx-auto">
            See how your work connects to goals while working alongside AI that understands your business. 
            The ultimate project management platform for modern teams.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
            <Link href="/register">
              <Button size="lg" className="w-full sm:w-auto hover:scale-100">
                <span className="hover:scale-105 transition-transform flex items-center">
                  Get Started Free
                  <ArrowRight className="ml-2 h-4 w-4" />
                </span>
              </Button>
            </Link>
            <Link href="#demo">
              <Button variant="outline" size="lg" className="w-full sm:w-auto hover:scale-100">
                <span className="hover:scale-105 transition-transform">See How It Works</span>
              </Button>
            </Link>
          </div>

          {/* Trust Indicators */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <div className="flex items-center gap-2 bg-background-glass backdrop-blur-sm px-4 py-2 rounded-full gradient-border">
              <CheckCircle className="h-5 w-5 text-success" />
              <span className="text-primary font-medium">No credit card required</span>
            </div>
            <div className="flex items-center gap-2 bg-background-glass backdrop-blur-sm px-4 py-2 rounded-full gradient-border">
              <CheckCircle className="h-5 w-5 text-success" />
              <span className="text-primary font-medium">14-day free trial</span>
            </div>
            <div className="flex items-center gap-2 bg-background-glass backdrop-blur-sm px-4 py-2 rounded-full gradient-border">
              <CheckCircle className="h-5 w-5 text-success" />
              <span className="text-primary font-medium">Cancel anytime</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// Features Section
function FeaturesSection() {
  const features = [
    {
      icon: <Target className="h-6 w-6" />,
      title: "Goal-Driven Planning",
      description: "Connect every task to your company goals and see real-time progress tracking."
    },
    {
      icon: <Users className="h-6 w-6" />,
      title: "Dynamic Team Management",
      description: "Flexible team structures with role-based permissions and cross-team collaboration."
    },
    {
      icon: <BarChart3 className="h-6 w-6" />,
      title: "Real-Time Analytics",
      description: "Get insights into team performance, project health, and resource allocation."
    },
    {
      icon: <MessageCircle className="h-6 w-6" />,
      title: "AI-Powered Assistance",
      description: "Smart suggestions, automated workflows, and intelligent task prioritization."
    },
    {
      icon: <Calendar className="h-6 w-6" />,
      title: "Timeline Management",
      description: "Visual project timelines, dependencies, and milestone tracking."
    },
    {
      icon: <Shield className="h-6 w-6" />,
      title: "Enterprise Security",
      description: "Bank-level security with SSO, advanced permissions, and audit logs."
    }
  ];

  return (
    <section id="features" className="py-20 bg-transparent backdrop-blur-sm">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-primary mb-4">
            Everything you need to manage work
          </h2>
          <p className="text-xl text-secondary max-w-3xl mx-auto">
            From small team collaboration to enterprise-scale project management, 
            Hub adapts to your workflow.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <Card key={index} variant="elevated" className="glassmorphism hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
              <CardHeader>
                <div className="w-12 h-12 bg-accent-10 rounded-lg flex items-center justify-center text-accent mb-4">
                  {feature.icon}
                </div>
                <CardTitle className="text-xl">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-secondary">
                  {feature.description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

// Social Proof Section
function SocialProofSection() {
  const companies = [
    { name: "TechCorp", logo: "🏢" },
    { name: "StartupXYZ", logo: "🚀" },
    { name: "GlobalSoft", logo: "🌐" },
    { name: "Innovation Labs", logo: "💡" },
    { name: "DataFlow", logo: "📊" },
    { name: "CloudTech", logo: "☁️" }
  ];

  return (
    <section className="py-16">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <p className="text-muted mb-8">Trusted by leading organizations worldwide</p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8">
            {companies.map((company, index) => (
              <div key={index} className="flex flex-col items-center">
                <div className="text-3xl mb-2">{company.logo}</div>
                <span className="text-sm text-muted">{company.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// Testimonials Section
function TestimonialsSection() {
  const testimonials = [
    {
      content: "Hub transformed how our team collaborates. The AI suggestions are incredibly helpful and the goal tracking keeps everyone aligned.",
      author: "Sarah Chen",
      role: "Product Manager",
      company: "TechFlow",
      avatar: "S"
    },
    {
      content: "Finally, a project management tool that actually understands our workflow. The dynamic team management is a game-changer.",
      author: "Marcus Rodriguez",
      role: "Engineering Lead",
      company: "Innovation Labs",
      avatar: "M"
    },
    {
      content: "The analytics and reporting features give us insights we never had before. Our project delivery improved by 40%.",
      author: "Emily Watson",
      role: "Operations Director",
      company: "GlobalSoft",
      avatar: "E"
    }
  ];

  return (
    <section id="testimonials" className="py-20">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-primary mb-4">
            Loved by teams of all sizes
          </h2>
          <p className="text-xl text-secondary">
            See what our customers have to say about their experience with Hub
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <Card key={index} variant="elevated" className="glassmorphism hover:shadow-lg transition-all duration-300">
              <CardContent className="pt-6">
                <div className="flex mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 text-rating fill-current" />
                  ))}
                </div>
                <p className="text-secondary mb-6 italic">
                  &ldquo;{testimonial.content}&rdquo;
                </p>
                <div className="flex items-center">
                  <Avatar name={testimonial.author} size="sm" className="mr-3" />
                  <div>
                    <div className="font-semibold text-primary">{testimonial.author}</div>
                    <div className="text-sm text-muted">{testimonial.role}, {testimonial.company}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

// Pricing Section
function PricingSection() {
  const plans = [
    {
      name: "Starter",
      price: "Free",
      description: "Perfect for small teams getting started",
      features: [
        "Up to 5 team members",
        "3 projects",
        "Basic task management",
        "Email support"
      ],
      cta: "Get Started",
      popular: false
    },
    {
      name: "Professional",
      price: "$12",
      period: "per user/month",
      description: "For growing teams and organizations",
      features: [
        "Unlimited team members",
        "Unlimited projects",
        "Advanced analytics",
        "AI-powered insights",
        "Priority support",
        "Custom workflows"
      ],
      cta: "Start Free Trial",
      popular: true
    },
    {
      name: "Enterprise",
      price: "Custom",
      description: "For large organizations with complex needs",
      features: [
        "Everything in Professional",
        "Single Sign-On (SSO)",
        "Advanced security controls",
        "Dedicated account manager",
        "Custom integrations",
        "SLA guarantee"
      ],
      cta: "Contact Sales",
      popular: false
    }
  ];

  return (
    <section id="pricing" className="py-20 bg-transparent backdrop-blur-sm">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-primary mb-4">
            Simple, transparent pricing
          </h2>
          <p className="text-xl text-secondary">
            Choose the plan that&apos;s right for your team
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {plans.map((plan, index) => (
            <Card key={index} variant="elevated" className={`glassmorphism relative hover:shadow-lg transition-all duration-300 flex flex-col ${plan.popular ? 'border-2 border-accent shadow-lg' : ''}`}>
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-interactive-primary text-on-accent">Most Popular</Badge>
                </div>
              )}
              <CardHeader className="text-center">
                <CardTitle className="text-2xl">{plan.name}</CardTitle>
                <div className="mt-4">
                  <span className="text-4xl font-bold text-primary">{plan.price}</span>
                  {plan.period && <span className="text-muted ml-2">{plan.period}</span>}
                </div>
                <CardDescription className="mt-2">{plan.description}</CardDescription>
              </CardHeader>
              <CardContent className="flex-grow flex flex-col">
                <ul className="space-y-3 mb-6 flex-grow">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-center">
                      <CheckCircle className="h-4 w-4 text-success mr-3 flex-shrink-0" />
                      <span className="text-secondary">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button 
                  className="w-full hover:scale-100 mt-auto" 
                  variant={plan.popular ? "primary" : "outline"}
                >
                  <span className="hover:scale-105 transition-transform">{plan.cta}</span>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

// Footer
function LandingFooter() {
  const footerSections = [
    {
      title: "Product",
      links: [
        { name: "Features", href: "#features" },
        { name: "Pricing", href: "#pricing" },
        { name: "Security", href: "#" },
        { name: "Integrations", href: "#" }
      ]
    },
    {
      title: "Company",
      links: [
        { name: "About", href: "#" },
        { name: "Careers", href: "#" },
        { name: "Blog", href: "#" },
        { name: "Press", href: "#" }
      ]
    },
    {
      title: "Resources",
      links: [
        { name: "Documentation", href: "#" },
        { name: "Help Center", href: "#" },
        { name: "Community", href: "#" },
        { name: "API", href: "#" }
      ]
    },
    {
      title: "Legal",
      links: [
        { name: "Privacy", href: "#" },
        { name: "Terms", href: "#" },
        { name: "Security", href: "#" },
        { name: "GDPR", href: "#" }
      ]
    }
  ];

  const socialLinks = [
    { icon: <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84"/></svg>, href: "#" },
    { icon: <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd"/></svg>, href: "#" },
    { icon: <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path fillRule="evenodd" d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>, href: "#" }
  ];

  return (
    <footer className="bg-background-glass backdrop-blur-xl border-t gradient-border">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Main Footer Content */}
        <div className="py-12 lg:py-16">
          <div className="grid grid-cols-2 gap-8 xl:grid-cols-6 lg:grid-cols-5 md:grid-cols-4">
            {/* Brand Section */}
            <div className="col-span-2 xl:col-span-2 lg:col-span-2 md:col-span-4">
              <div className="flex items-center space-x-2 mb-4">
                <div className="flex items-center justify-center w-10 h-10 bg-interactive-primary rounded-lg">
                  <Zap className="h-6 w-6 text-on-accent" />
                </div>
                <span className="text-2xl font-bold text-primary">Hub</span>
              </div>
              <p className="text-muted mb-6 max-w-sm">
                The modern project management platform that helps teams achieve more together. Built for the future of work.
              </p>
              <div className="flex space-x-4">
                {socialLinks.map((social, index) => (
                  <a
                    key={index}
                    href={social.href}
                    className="w-10 h-10 bg-interactive-secondary-hover rounded-lg flex items-center justify-center text-muted hover:text-primary hover:bg-accent-10 transition-all duration-200"
                  >
                    {social.icon}
                  </a>
                ))}
              </div>
            </div>

            {/* Footer Links */}
            {footerSections.map((section, index) => (
              <div key={index} className="col-span-1">
                <h3 className="font-semibold text-primary mb-4">{section.title}</h3>
                <ul className="space-y-3">
                  {section.links.map((link, linkIndex) => (
                    <li key={linkIndex}>
                      <a
                        href={link.href}
                        className="text-muted hover:text-primary transition-colors duration-200 text-sm"
                      >
                        {link.name}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <Separator className="border-secondary" />

        {/* Bottom Footer */}
        <div className="py-6">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-6">
              <p className="text-muted text-sm">
                © 2024 Hub. All rights reserved.
              </p>
              <div className="flex items-center space-x-6 text-sm">
                <a href="#" className="text-muted hover:text-primary transition-colors">Privacy Policy</a>
                <a href="#" className="text-muted hover:text-primary transition-colors">Terms of Service</a>
                <a href="#" className="text-muted hover:text-primary transition-colors">Cookie Policy</a>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <ThemeToggle />
              <span className="text-muted text-sm hidden sm:inline">Made with ❤️ for productive teams</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

// Main Landing Page
export default function LandingPage() {
  return (
    <BackgroundWrapper>
      <LandingHeader />
      <main>
        <HeroSection />
        <SocialProofSection />
        <FeaturesSection />
        <TestimonialsSection />
        <PricingSection />
      </main>
      <LandingFooter />
    </BackgroundWrapper>
  );
}
