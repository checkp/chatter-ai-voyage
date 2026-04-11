
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MessageSquare, Send } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

const ContactUsButton = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) {
      toast.error('Please enter a message');
      return;
    }

    setIsSubmitting(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('send-telegram-message', {
        body: {
          email: email || 'Not provided',
          message: message,
        },
      });

      if (error) {
        console.error('Error sending message:', error);
        throw error;
      }

      console.log('Message sent successfully:', data);
      toast.success('Thank you for your feedback! We\'ll get back to you soon.');
      setMessage('');
      setEmail('');
      setIsOpen(false);
    } catch (error: any) {
      console.error('Failed to send message:', error);
      toast.error('Failed to send message. Please try again later.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button
            className="shadow-lg"
            size="sm"
            variant="outline"
          >
            <MessageSquare className="h-4 w-4 mr-2" />
            Contact Us
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Contact Us</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email">Email (optional)</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your.email@example.com"
                disabled={isSubmitting}
              />
            </div>
            <div>
              <Label htmlFor="message">Message *</Label>
              <Textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Tell us your suggestions, feedback, or report any issues..."
                className="min-h-[100px]"
                required
                disabled={isSubmitting}
              />
            </div>
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              <Send className="h-4 w-4 mr-2" />
              {isSubmitting ? 'Sending...' : 'Send Message'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ContactUsButton;
