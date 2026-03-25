import React from 'react';
import { Box, Heading, Inline, Lozenge, Stack, Strong, Text, Tooltip } from '@forge/react';

const heroStyles = {
    paddingBlock: 'space.100'
};

const scoreLabelStyles = {
    color: 'color.text.subtle'
};

const metadataColumnStyles = {
    minWidth: '160px'
};

const scoreCardStyles = {
    paddingBlock: 'space.025'
};

const usageIndicatorStyles = {
    paddingInline: 'space.100',
    paddingBlock: 'space.050',
    borderRadius: 'border.radius',
    backgroundColor: 'color.background.neutral.subtle'
};

const usageIndicatorWarningStyles = {
    paddingInline: 'space.100',
    paddingBlock: 'space.050',
    borderRadius: 'border.radius',
    backgroundColor: 'color.background.warning'
};

const buildMonthlyUsageModel = usage => {
    const monthly = usage?.installation?.monthly;

    if (!monthly) {
        return null;
    }

    const limit = Math.max(1, Number(monthly.limit) || 1);
    const count = Math.max(0, Number(monthly.count) || 0);
    const percent = Math.min(100, Math.round((count / limit) * 100));

    return {
        count,
        limit,
        percent,
        isWarning: percent > 80
    };
};

const buildUsageTooltipText = usage => {
    const monthlyModel = buildMonthlyUsageModel(usage);
    const daily = usage?.installation?.daily;
    const hourly = usage?.currentUser?.hourly;

    if (!monthlyModel || !daily || !hourly) {
        return '';
    }

    return `Nutzung\nMonat: ${monthlyModel.count} / ${monthlyModel.limit} (${monthlyModel.percent}%)\nHeute: ${daily.count} / ${daily.limit}\nStunde: ${hourly.count} / ${hourly.limit}`;
};

const UsageIndicator = ({ usage }) => {
    const monthlyModel = buildMonthlyUsageModel(usage);
    const tooltipText = buildUsageTooltipText(usage);

    if (!monthlyModel || !tooltipText) {
        return null;
    }

    return (
        <Tooltip content={tooltipText}>
            <Box xcss={monthlyModel.isWarning ? usageIndicatorWarningStyles : usageIndicatorStyles}>
                <Text>
                    Nutzung <Strong>{`${monthlyModel.percent}%`}</Strong>
                </Text>
            </Box>
        </Tooltip>
    );
};

const ReflectionHeader = ({ averageScore, statusLabel, isReady, usage }) => (
    <Box xcss={heroStyles}>
        <Inline spread="space-between" alignBlock="start" shouldWrap rowSpace="space.150">
            <Stack space="space.100">
                <Inline space="space.100" alignBlock="center" shouldWrap>
                    <Heading as="h3">Insight Dashboard</Heading>
                    <Lozenge>{statusLabel}</Lozenge>
                    <UsageIndicator usage={usage} />
                </Inline>
                <Text>AI-basierte Qualitätsreflexion für Verständlichkeit, Konsistenz und Business Value.</Text>
            </Stack>

            <Stack alignInline="end" space="space.025" xcss={metadataColumnStyles}>
                <Box xcss={scoreCardStyles}>
                    <Box xcss={scoreLabelStyles}>
                        <Text>Durchschnittsscore</Text>
                    </Box>
                </Box>
                <Heading as="h2">{isReady ? `${averageScore}/10` : '--'}</Heading>
            </Stack>
        </Inline>
    </Box>
);

export default ReflectionHeader;
