import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useTheme } from '@/context/ThemeProvider';
import { useI18n } from '@/context/I18nProvider';
import Icon from '@/components/Icon';
import { createStyles } from './styles';

interface FAQItem {
  id: string;
  question: string;
  answer: string;
}

interface FAQGroup {
  key: string;
  title: string;
  items: FAQItem[];
}

export default function FAQSection() {
  const { theme } = useTheme();
  const { t } = useI18n();
  const styles = createStyles(theme);

  const [expandedFAQ, setExpandedFAQ] = useState<string | null>(null);
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);

  const faqGroups: FAQGroup[] = [
    {
      key: 'gettingStarted',
      title: t('helpFeedback.faqGroups.gettingStarted'),
      items: [
        { id: 'gs1', question: t('helpFeedback.faq.gs1q'), answer: t('helpFeedback.faq.gs1a') },
        { id: 'gs2', question: t('helpFeedback.faq.gs2q'), answer: t('helpFeedback.faq.gs2a') },
        { id: 'gs3', question: t('helpFeedback.faq.gs3q'), answer: t('helpFeedback.faq.gs3a') },
      ],
    },
    {
      key: 'words',
      title: t('helpFeedback.faqGroups.words'),
      items: [
        { id: 'w1', question: t('helpFeedback.faq.w1q'), answer: t('helpFeedback.faq.w1a') },
        { id: 'w2', question: t('helpFeedback.faq.w2q'), answer: t('helpFeedback.faq.w2a') },
        { id: 'w3', question: t('helpFeedback.faq.w3q'), answer: t('helpFeedback.faq.w3a') },
        { id: 'w4', question: t('helpFeedback.faq.w4q'), answer: t('helpFeedback.faq.w4a') },
        { id: 'w5', question: t('helpFeedback.faq.w5q'), answer: t('helpFeedback.faq.w5a') },
        { id: 'w6', question: t('helpFeedback.faq.w6q'), answer: t('helpFeedback.faq.w6a') },
        { id: 'w7', question: t('helpFeedback.faq.w7q'), answer: t('helpFeedback.faq.w7a') },
      ],
    },
    {
      key: 'pronunciation',
      title: t('helpFeedback.faqGroups.pronunciation'),
      items: [
        { id: 'p1', question: t('helpFeedback.faq.p1q'), answer: t('helpFeedback.faq.p1a') },
        { id: 'p2', question: t('helpFeedback.faq.p2q'), answer: t('helpFeedback.faq.p2a') },
      ],
    },
    {
      key: 'grammar',
      title: t('helpFeedback.faqGroups.grammar'),
      items: [
        { id: 'g1', question: t('helpFeedback.faq.g1q'), answer: t('helpFeedback.faq.g1a') },
        { id: 'g2', question: t('helpFeedback.faq.g2q'), answer: t('helpFeedback.faq.g2a') },
      ],
    },
    {
      key: 'aiChat',
      title: t('helpFeedback.faqGroups.aiChat'),
      items: [
        { id: 'ai1', question: t('helpFeedback.faq.ai1q'), answer: t('helpFeedback.faq.ai1a') },
        { id: 'ai2', question: t('helpFeedback.faq.ai2q'), answer: t('helpFeedback.faq.ai2a') },
        { id: 'ai3', question: t('helpFeedback.faq.ai3q'), answer: t('helpFeedback.faq.ai3a') },
      ],
    },
    {
      key: 'readingStory',
      title: t('helpFeedback.faqGroups.readingStory'),
      items: [
        { id: 'rs1', question: t('helpFeedback.faq.rs1q'), answer: t('helpFeedback.faq.rs1a') },
        { id: 'rs2', question: t('helpFeedback.faq.rs2q'), answer: t('helpFeedback.faq.rs2a') },
      ],
    },
    {
      key: 'subscription',
      title: t('helpFeedback.faqGroups.subscription'),
      items: [
        { id: 's1', question: t('helpFeedback.faq.s1q'), answer: t('helpFeedback.faq.s1a') },
        { id: 's2', question: t('helpFeedback.faq.s2q'), answer: t('helpFeedback.faq.s2a') },
        { id: 's3', question: t('helpFeedback.faq.s3q'), answer: t('helpFeedback.faq.s3a') },
        { id: 's4', question: t('helpFeedback.faq.s4q'), answer: t('helpFeedback.faq.s4a') },
        { id: 's5', question: t('helpFeedback.faq.s5q'), answer: t('helpFeedback.faq.s5a') },
        { id: 's6', question: t('helpFeedback.faq.s6q'), answer: t('helpFeedback.faq.s6a') },
        { id: 's7', question: t('helpFeedback.faq.s7q'), answer: t('helpFeedback.faq.s7a') },
      ],
    },
    {
      key: 'accountSettings',
      title: t('helpFeedback.faqGroups.accountSettings'),
      items: [
        { id: 'as1', question: t('helpFeedback.faq.as1q'), answer: t('helpFeedback.faq.as1a') },
        { id: 'as2', question: t('helpFeedback.faq.as2q'), answer: t('helpFeedback.faq.as2a') },
        { id: 'as3', question: t('helpFeedback.faq.as3q'), answer: t('helpFeedback.faq.as3a') },
        { id: 'as4', question: t('helpFeedback.faq.as4q'), answer: t('helpFeedback.faq.as4a') },
        { id: 'as5', question: t('helpFeedback.faq.as5q'), answer: t('helpFeedback.faq.as5a') },
      ],
    },
  ];

  const toggleFAQ = (id: string) => {
    setExpandedFAQ(expandedFAQ === id ? null : id);
  };

  const toggleGroup = (key: string) => {
    setExpandedGroup(expandedGroup === key ? null : key);
  };

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{t('helpFeedback.faqTitle')}</Text>

      {faqGroups.map((group) => (
        <View key={group.key} style={styles.faqGroup}>
          <TouchableOpacity
            style={styles.faqGroupHeader}
            onPress={() => toggleGroup(group.key)}
            activeOpacity={0.7}
          >
            <Text style={styles.faqGroupTitle}>{group.title}</Text>
            <View style={styles.faqGroupRight}>
              <Text style={styles.faqGroupCount}>{group.items.length}</Text>
              <Icon
                name={expandedGroup === group.key ? 'expand-less' : 'expand-more'}
                size={22}
                color={theme.colors.text.secondary}
              />
            </View>
          </TouchableOpacity>

          {expandedGroup === group.key && (
            <View style={styles.faqGroupContent}>
              {group.items.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.faqItem}
                  onPress={() => toggleFAQ(item.id)}
                  activeOpacity={0.7}
                >
                  <View style={styles.faqHeader}>
                    <Text style={styles.faqQuestion}>{item.question}</Text>
                    <Icon
                      name={expandedFAQ === item.id ? 'expand-less' : 'expand-more'}
                      size={24}
                      color={theme.colors.text.secondary}
                    />
                  </View>
                  {expandedFAQ === item.id && (
                    <Text style={styles.faqAnswer}>{item.answer}</Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      ))}
    </View>
  );
}
