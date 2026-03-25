import React from 'react';
import { Box, Heading, Inline, Lozenge, Stack, Strong, Text } from '@forge/react';

const heroStyles = {
    paddingBlock: 'space.100'
};

const scoreLabelStyles = {
    color: 'color.text.subtle'
};

const metadataColumnStyles = {
    minWidth: '240px'
};

const scoreCardStyles = {
    paddingBlock: 'space.025'
};

const usageCardStyles = {
    padding: 'space.125',
    borderRadius: 'border.radius',
    backgroundColor: 'color.background.neutral.subtle'
};

const usageValueStyles = {
    color: 'color.text.subtle'
};

const usageTrackStyles = {
    width: '100%',
    height: '4px',
    borderRadius: 'border.radius',
    backgroundColor: 'color.background.neutral'
};

const buildUsageItems = usage => {
    if (!usage?.installation || !usage?.currentUser) {
        return [];
    }

    return [
        {
            label: 'Heute',
            count: usage.installation.daily.count,
            limit: usage.installation.daily.limit
        },
        {
            label: 'Monat',
            count: usage.installation.monthly.count,
            limit: usage.installation.monthly.limit
        },
        {
            label: 'Stunde',
            count: usage.currentUser.hourly.count,
            limit: usage.currentUser.hourly.limit
        }
    ];
};

const QuotaCard = ({ usage }) => {
    const items = buildUsageItems(usage);

    if (!items.length) {
        return null;
    }

    return (
        <Box xcss={usageCardStyles}>
            <Stack space="space.125">
                <Text>Nutzung</Text>
                <Stack space="space.100">
                    {items.map(item => (
                        <QuotaStat key={item.label} {...item} />
                    ))}
                </Stack>
            </Stack>
        </Box>
    );
};

const QuotaStat = ({ label, count, limit }) => {
    const safeLimit = Math.max(1, Number(limit) || 1);
    const safeCount = Math.max(0, Number(count) || 0);
    const percent = Math.min(100, Math.round((safeCount / safeLimit) * 100));
    const quotaFillStyles = {
        width: `${percent}%`,
        height: '4px',
        borderRadius: 'border.radius',
        backgroundColor: 'color.background.discovery.bold'
    };

    return (
        <Stack space="space.050">
            <Inline spread="space-between" alignBlock="center">
                <Text>{label}</Text>
                <Box xcss={usageValueStyles}>
                    <Text>
                        <Strong>{`${safeCount}/${safeLimit}`}</Strong>
                    </Text>
                </Box>
            </Inline>
            <Box xcss={usageTrackStyles}>
                <Box xcss={quotaFillStyles} />
            </Box>
        </Stack>
    );
};

const ReflectionHeader = ({ averageScore, statusLabel, isReady, usage }) => (
    <Box xcss={heroStyles}>
        <Inline spread="space-between" alignBlock="start" shouldWrap rowSpace="space.150">
            <Stack space="space.100">
                <Inline space="space.100" alignBlock="center" shouldWrap>
                    <Heading as="h3">Insight Dashboard</Heading>
                    <Lozenge>{statusLabel}</Lozenge>
                </Inline>
                <Text>AI-basierte Qualitätsreflexion für Verständlichkeit, Konsistenz und Business Value.</Text>
            </Stack>

            <Stack alignInline="stretch" space="space.125" xcss={metadataColumnStyles}>
                <Box xcss={scoreCardStyles}>
                    <Stack alignInline="end" space="space.025">
                        <Box xcss={scoreLabelStyles}>
                            <Text>Durchschnittsscore</Text>
                        </Box>
                        <Heading as="h2">{isReady ? `${averageScore}/10` : '--'}</Heading>
                    </Stack>
                </Box>
                <QuotaCard usage={usage} />
            </Stack>
        </Inline>
    </Box>
);

export default ReflectionHeader;
