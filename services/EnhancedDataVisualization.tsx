import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import SQLResultChart from './SQLResultChart';

// Interface for data visualization options
interface TableOptions {
  maxTableHeight?: number;
}

interface EnhancedDataVisualizationProps {
  data: any;
  error?: string;
  onLayout?: () => void;
  tableOptions?: TableOptions;
  enableChartTypeSwitching?: boolean;
}

// Minimal data visualization component that just renders SQL results in text format
const EnhancedDataVisualization: React.FC<EnhancedDataVisualizationProps> = ({
  data,
  error,
  onLayout,
}) => {
  // Handle error states
  if (error) {
    return (
      <View style={styles.container} onLayout={onLayout}>
        <Text style={styles.errorText}>Error: {error}</Text>
      </View>
    );
  }

  // Handle no data
  if (!data) {
    return (
      <View style={styles.container} onLayout={onLayout}>
        <Text style={styles.noDataText}>No data available</Text>
      </View>
    );
  }

  // Render SQL result chart in terminal style
  return (
    <View style={styles.container} onLayout={onLayout}>
      <SQLResultChart data={data} error={error} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 2,
  },
  errorText: {
    color: '#F55',
    fontSize: 14,
  },
  noDataText: {
    color: '#999',
    fontSize: 14,
  }
});

export default EnhancedDataVisualization; 