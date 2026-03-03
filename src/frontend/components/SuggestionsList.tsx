import React from 'react';
import { Box, Inline, Stack, Text } from '@forge/react';

const itemStyles = {
    paddingBlock: 'space.100',
    borderBottomWidth: 'border.width',
    borderBottomStyle: 'solid',
    borderBottomColor: 'color.border'
};

const lastItemStyles = {
    borderBottomStyle: 'none'
};

const iconStyles = {
    minWidth: '20px'
};

const SuggestionsList = ({ suggestions }) => {
    if (!Array.isArray(suggestions) || suggestions.length === 0) {
        return <Text>Keine konkreten Vorschläge vorhanden.</Text>;
    }

    return (
        <Stack space="space.000">
            {suggestions.map((suggestion, index) => (
                <Box
                    key={`${suggestion}-${index}`}
                    xcss={index === suggestions.length - 1 ? { ...itemStyles, ...lastItemStyles } : itemStyles}
                >
                    <Inline space="space.100" alignBlock="start">
                        <Box xcss={iconStyles}>
                            <Text>💡</Text>
                        </Box>
                        <Text>{suggestion}</Text>
                    </Inline>
                </Box>
            ))}
        </Stack>
    );
};

export default SuggestionsList;
