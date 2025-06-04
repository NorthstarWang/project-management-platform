'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { Separator } from '@/components/ui/Separator';
import { 
  Zap, 
  Users, 
  Calendar, 
  BarChart3, 
  Shield,
  ArrowRight, 
  CheckCircle,
  Star,
  Globe,
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
    <header className="sticky top-0 z-50 w-full bg-background-primary/95 backdrop-blur-md border-b border-border-secondary">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center space-x-2">
            <div className="flex items-center justify-center w-8 h-8 bg-interactive-primary rounded-lg">
              <Zap className="h-5 w-5 text-text-on-accent" />
            </div>
            <span className="text-xl font-bold text-text-primary">Hub</span>
            <Badge variant="secondary" size="sm" className="hidden sm:inline-flex">Beta</Badge>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            {navigation.map((item) => (
              <a
                key={item.name}
                href={item.href}
                className="text-text-secondary hover:text-text-primary transition-colors duration-200 font-medium"
              >
                {item.name}
              </a>
            ))}
          </nav>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center space-x-4">
            <ThemeToggle />
            <Link href="/login">
              <Button variant="ghost" size="sm">Sign In</Button>
            </Link>
            <Link href="/register">
              <Button size="sm">Get Started</Button>
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
        {mobileMenuOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 bg-background-secondary rounded-lg mt-2 mb-4">
              {navigation.map((item) => (
                <a
                  key={item.name}
                  href={item.href}
                  className="block px-3 py-2 text-text-secondary hover:text-text-primary transition-colors duration-200"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item.name}
                </a>
              ))}
              <Separator className="my-2" />
              <Link href="/login" className="block px-3 py-2">
                <Button variant="ghost" size="sm" className="w-full justify-start">Sign In</Button>
              </Link>
              <Link href="/register" className="block px-3 py-2">
                <Button size="sm" className="w-full">Get Started</Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}

// Hero Section
function HeroSection() {
  return (
    <section className="relative px-4 sm:px-6 lg:px-8 py-20 lg:py-32">
      <div className="container mx-auto text-center">
        <div className="max-w-4xl mx-auto">
          <Badge variant="outline" className="mb-6 bg-accent-bg-5 border-accent-border-20">
            <Star className="w-3 h-3 mr-1" />
            Trusted by 10,000+ teams worldwide
          </Badge>
          
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-text-primary mb-6 leading-tight">
            Where your teams and 
            <span className="text-text-accent"> AI coordinate</span>
            <br />work together
          </h1>
          
          <p className="text-xl sm:text-2xl text-text-secondary mb-8 max-w-3xl mx-auto">
            See how your work connects to goals while working alongside AI that understands your business. 
            The ultimate project management platform for modern teams.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
            <Link href="/register">
              <Button size="lg" className="w-full sm:w-auto">
                Get Started Free
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="#demo">
              <Button variant="outline" size="lg" className="w-full sm:w-auto">
                See How It Works
              </Button>
            </Link>
          </div>

          {/* Trust Indicators */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-8 text-text-muted">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-accent-success" />
              <span>No credit card required</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-accent-success" />
              <span>14-day free trial</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-accent-success" />
              <span>Cancel anytime</span>
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
    <section id="features" className="py-20 bg-background-secondary">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-text-primary mb-4">
            Everything you need to manage work
          </h2>
          <p className="text-xl text-text-secondary max-w-3xl mx-auto">
            From small team collaboration to enterprise-scale project management, 
            Hub adapts to your workflow.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <Card key={index} className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
              <CardHeader>
                <div className="w-12 h-12 bg-accent-bg-10 rounded-lg flex items-center justify-center text-text-accent mb-4">
                  {feature.icon}
                </div>
                <CardTitle className="text-xl">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-text-secondary">
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
    <section className="py-16 bg-background-primary">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <p className="text-text-muted mb-8">Trusted by leading organizations worldwide</p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8">
            {companies.map((company, index) => (
              <div key={index} className="flex flex-col items-center">
                <div className="text-3xl mb-2">{company.logo}</div>
                <span className="text-sm text-text-muted">{company.name}</span>
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
    <section id="testimonials" className="py-20 bg-background-secondary">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-text-primary mb-4">
            Loved by teams of all sizes
          </h2>
          <p className="text-xl text-text-secondary">
            See what our customers have to say about their experience with Hub
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <Card key={index} className="hover:shadow-lg transition-all duration-300">
              <CardContent className="pt-6">
                <div className="flex mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 text-yellow-400 fill-current" />
                  ))}
                </div>
                <p className="text-text-secondary mb-6 italic">
                  &ldquo;{testimonial.content}&rdquo;
                </p>
                <div className="flex items-center">
                  <Avatar name={testimonial.author} size="sm" className="mr-3" />
                  <div>
                    <div className="font-semibold text-text-primary">{testimonial.author}</div>
                    <div className="text-sm text-text-muted">{testimonial.role}, {testimonial.company}</div>
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
    <section id="pricing" className="py-20 bg-background-primary">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-text-primary mb-4">
            Simple, transparent pricing
          </h2>
          <p className="text-xl text-text-secondary">
            Choose the plan that&apos;s right for your team
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {plans.map((plan, index) => (
            <Card key={index} className={`relative hover:shadow-lg transition-all duration-300 ${plan.popular ? 'border-accent-border-30 shadow-lg' : ''}`}>
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-interactive-primary text-text-on-accent">Most Popular</Badge>
                </div>
              )}
              <CardHeader className="text-center">
                <CardTitle className="text-2xl">{plan.name}</CardTitle>
                <div className="mt-4">
                  <span className="text-4xl font-bold text-text-primary">{plan.price}</span>
                  {plan.period && <span className="text-text-muted ml-2">{plan.period}</span>}
                </div>
                <CardDescription className="mt-2">{plan.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-center">
                      <CheckCircle className="h-4 w-4 text-accent-success mr-3 flex-shrink-0" />
                      <span className="text-text-secondary">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button 
                  className="w-full" 
                  variant={plan.popular ? "primary" : "outline"}
                >
                  {plan.cta}
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

  return (
    <footer className="bg-background-secondary border-t border-border-secondary">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center space-x-2 mb-4">
              <div className="flex items-center justify-center w-8 h-8 bg-interactive-primary rounded-lg">
                <Zap className="h-5 w-5 text-text-on-accent" />
              </div>
              <span className="text-xl font-bold text-text-primary">Hub</span>
            </div>
            <p className="text-text-muted mb-4">
              The modern project management platform that helps teams achieve more together.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="text-text-muted hover:text-text-primary transition-colors">
                <Globe className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Links */}
          {footerSections.map((section, index) => (
            <div key={index}>
              <h3 className="font-semibold text-text-primary mb-4">{section.title}</h3>
              <ul className="space-y-2">
                {section.links.map((link, linkIndex) => (
                  <li key={linkIndex}>
                    <a
                      href={link.href}
                      className="text-text-muted hover:text-text-primary transition-colors"
                    >
                      {link.name}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <Separator className="my-8" />

        <div className="flex flex-col md:flex-row justify-between items-center">
          <p className="text-text-muted text-sm">
            © 2024 Hub. All rights reserved.
          </p>
          <div className="flex items-center space-x-4 mt-4 md:mt-0">
            <ThemeToggle />
            <span className="text-text-muted text-sm">Made with ❤️ for productive teams</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

// Main Landing Page
export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background-primary">
      <LandingHeader />
      <main>
        <HeroSection />
        <SocialProofSection />
        <FeaturesSection />
        <TestimonialsSection />
        <PricingSection />
      </main>
      <LandingFooter />
    </div>
  );
}
