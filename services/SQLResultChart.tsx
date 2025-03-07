/**
 * SQLResultChart.tsx
 * 
 * A component for visualizing SQL query results with multiple view options:
 * - Table view: Shows data in a tabular format with scrollable rows and columns
 * - Bar chart: Displays data as a bar chart for comparing values
 * - Line chart: Shows data as a line chart for trend analysis
 * 
 * The component automatically selects appropriate columns for labels and values,
 * and provides a toggle interface to switch between visualization types.
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions, TouchableOpacity } from 'react-native';
import { BarChart, LineChart } from 'react-native-chart-kit';

interface SQLResultChartProps {
  data: {
    columnNames: string[];
    rows: any[][];
    rowCount: number;
    totalRowCount?: number;
  } | null;
  error?: string;
}

// Visualization types for toggle
type VisualizationType = 'table' | 'bar' | 'line';

const SQLResultChart: React.FC<SQLResultChartProps> = ({ data, error }) => {
  // State to track the current visualization type
  const [visualizationType, setVisualizationType] = useState<VisualizationType>('table');

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Error: {error}</Text>
      </View>
    );
  }

  if (!data || !data.columnNames || !data.rows || data.rows.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.noDataText}>No data available</Text>
      </View>
    );
  }

  // Calculate consistent column width based on number of columns
  const columnCount = data.columnNames.length;
  const columnWidth = Math.max(120, Math.min(200, 900 / columnCount));
  
  // Get window dimensions for responsive height calculation
  const windowHeight = Dimensions.get('window').height;
  const windowWidth = Dimensions.get('window').width;
  // Calculate a reasonable max height for the table - either 60% of window height or 500px max
  const tableMaxHeight = Math.min(windowHeight * 0.6, 500);

  // Display actual rows count vs total if different
  const rowCountText = data.totalRowCount && data.totalRowCount > data.rowCount 
    ? `${data.rowCount} displayed of ${data.totalRowCount} total rows`
    : `${data.rowCount} rows`;

  // Prepare data for charts
  // We'll intelligently select columns for chart visualization
  const prepareChartData = () => {
    if (!data || data.rows.length === 0) return null;

    console.log('Preparing chart data from:', data.columnNames, data.rows[0]);
    
    // For simplicity, we'll use up to 10 rows for the chart
    // In a real app, you might want to add pagination or filtering
    const displayRows = data.rows.slice(0, 10);
    
    // Find the most appropriate columns for labels and values
    // Strategy: Look for a numeric column (likely to be values) and a string column (likely to be labels)
    let labelColumnIndex = 0;
    let valueColumnIndex = 1;
    
    // Try to find the first string column for labels and first numeric column for values
    const firstRowSample = data.rows[0] || [];
    for (let i = 0; i < firstRowSample.length; i++) {
      const value = firstRowSample[i];
      // If we find a non-numeric column first, use it for labels
      if (typeof value !== 'number' && !isNumericString(value) && labelColumnIndex === 0) {
        labelColumnIndex = i;
      }
      // If we find a numeric column first, use it for values
      else if ((typeof value === 'number' || isNumericString(value)) && valueColumnIndex === 1 && i !== labelColumnIndex) {
        valueColumnIndex = i;
        break;
      }
    }
    
    console.log(`Using column ${labelColumnIndex} (${data.columnNames[labelColumnIndex]}) for labels`);
    console.log(`Using column ${valueColumnIndex} (${data.columnNames[valueColumnIndex]}) for values`);
    
    // Extract labels from selected label column
    const labels = displayRows.map(row => {
      // Truncate long labels for better display
      const label = String(row[labelColumnIndex] || '');
      return label.length > 10 ? label.substring(0, 10) + '...' : label;
    });
    
    // Extract values from selected value column, ensuring proper numeric conversion
    const values = displayRows.map(row => {
      const val = row[valueColumnIndex];
      return parseNumericValue(val);
    });
    
    console.log('Chart labels:', labels);
    console.log('Chart values:', values);

    return {
      labels,
      datasets: [
        {
          data: values,
          color: (opacity = 1) => `rgba(74, 227, 131, ${opacity})`, // Match header color
          strokeWidth: 2
        }
      ],
      legend: [data.columnNames[valueColumnIndex] || 'Value'] // Use actual column name as legend
    };
  };
  
  // Helper function to check if a string represents a number
  const isNumericString = (value: any): boolean => {
    if (typeof value === 'number') return true;
    if (typeof value !== 'string') return false;
    return !isNaN(parseFloat(value)) && isFinite(Number(value));
  };
  
  // Helper function to safely parse a numeric value from various formats
  const parseNumericValue = (value: any): number => {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      // Remove any non-numeric characters except decimal point
      const cleaned = value.replace(/[^0-9.-]/g, '');
      return parseFloat(cleaned) || 0;
    }
    return 0;
  };

  // Common chart configuration
  const chartConfig = {
    backgroundColor: '#f8f9fa',
    backgroundGradientFrom: '#f8f9fa',
    backgroundGradientTo: '#f8f9fa',
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(74, 227, 131, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(51, 51, 51, ${opacity})`,
    style: {
      borderRadius: 16
    },
    propsForDots: {
      r: '6',
      strokeWidth: '2',
      stroke: '#3ad372'
    }
  };

  const chartData = prepareChartData();
  
  // Widget to toggle between visualizations
  const VisualizationToggle = () => (
    <View style={styles.toggleContainer}>
      <TouchableOpacity 
        style={[
          styles.toggleButton, 
          visualizationType === 'table' && styles.toggleButtonActive
        ]}
        onPress={() => setVisualizationType('table')}
      >
        <Text style={[
          styles.toggleText,
          visualizationType === 'table' && styles.toggleTextActive
        ]}>Table</Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={[
          styles.toggleButton, 
          visualizationType === 'bar' && styles.toggleButtonActive
        ]}
        onPress={() => setVisualizationType('bar')}
      >
        <Text style={[
          styles.toggleText,
          visualizationType === 'bar' && styles.toggleTextActive
        ]}>Bar</Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={[
          styles.toggleButton, 
          visualizationType === 'line' && styles.toggleButtonActive
        ]}
        onPress={() => setVisualizationType('line')}
      >
        <Text style={[
          styles.toggleText,
          visualizationType === 'line' && styles.toggleTextActive
        ]}>Line</Text>
      </TouchableOpacity>
    </View>
  );

  // Table View
  const TableView = () => (
    <View style={styles.tableWrapper}>
      {/* Horizontal scrolling for wide tables */}
      <ScrollView horizontal={true} style={styles.horizontalScroll}>
        <View>
          {/* Header Row */}
          <View style={styles.tableRow}>
            {data.columnNames.map((column, index) => (
              <View 
                key={`header-${index}`} 
                style={[styles.headerCell, { width: columnWidth }]}
              >
                <Text style={styles.headerText} numberOfLines={2} ellipsizeMode="tail">
                  {column}
                </Text>
              </View>
            ))}
          </View>
          
          {/* Vertical scrolling for many rows */}
          <ScrollView style={[styles.verticalScroll, { maxHeight: tableMaxHeight }]}>
            {/* Data Rows */}
            {data.rows.map((row, rowIndex) => (
              <View key={`row-${rowIndex}`} style={styles.tableRow}>
                {row.map((cell, cellIndex) => (
                  <View 
                    key={`cell-${rowIndex}-${cellIndex}`} 
                    style={[styles.tableCell, { width: columnWidth }]}
                  >
                    <Text style={styles.cellText} numberOfLines={2} ellipsizeMode="tail">
                      {cell === null ? 'NULL' : String(cell)}
                    </Text>
                  </View>
                ))}
              </View>
            ))}
          </ScrollView>
        </View>
      </ScrollView>
    </View>
  );

  // Chart Views
  const BarChartView = () => (
    chartData ? (
      <ScrollView horizontal={true}>
        <BarChart
          data={chartData}
          width={Math.max(windowWidth - 40, chartData.labels.length * 80)}
          height={tableMaxHeight}
          yAxisLabel=""
          yAxisSuffix=""
          chartConfig={chartConfig}
          verticalLabelRotation={30}
          showValuesOnTopOfBars={true}
          fromZero={true}
          style={styles.chartStyle}
        />
      </ScrollView>
    ) : (
      <Text style={styles.noDataText}>Could not prepare chart data</Text>
    )
  );
  
  const LineChartView = () => (
    chartData ? (
      <ScrollView horizontal={true}>
        <LineChart
          data={chartData}
          width={Math.max(windowWidth - 40, chartData.labels.length * 80)}
          height={tableMaxHeight}
          yAxisLabel=""
          yAxisSuffix=""
          chartConfig={chartConfig}
          verticalLabelRotation={30}
          bezier
          fromZero={true}
          style={styles.chartStyle}
        />
      </ScrollView>
    ) : (
      <Text style={styles.noDataText}>Could not prepare chart data</Text>
    )
  );

  return (
    <View style={styles.container}>
      <Text style={styles.resultTitle}>Data Results ({rowCountText})</Text>
      
      {/* Visualization Toggle */}
      <VisualizationToggle />
      
      {/* Visualization Content */}
      {visualizationType === 'table' && <TableView />}
      {visualizationType === 'bar' && <BarChartView />}
      {visualizationType === 'line' && <LineChartView />}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 10,
    marginVertical: 10,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  toggleContainer: {
    flexDirection: 'row',
    marginBottom: 15,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#ddd',
    alignSelf: 'center',
  },
  toggleButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#f8f9fa',
  },
  toggleButtonActive: {
    backgroundColor: '#4ae383',
  },
  toggleText: {
    color: '#333',
    fontWeight: '500',
  },
  toggleTextActive: {
    color: 'white',
    fontWeight: 'bold',
  },
  tableWrapper: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    overflow: 'hidden',
  },
  chartStyle: {
    borderRadius: 8,
    padding: 10,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  horizontalScroll: {
    // No fixed height here
  },
  verticalScroll: {
    // Dynamic max height will be set in component
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  headerCell: {
    padding: 10,
    backgroundColor: '#4ae383',
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: '#3ad372',
  },
  headerText: {
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'left',
  },
  tableCell: {
    padding: 10,
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: '#ddd',
    backgroundColor: 'white',
  },
  cellText: {
    color: '#333',
    textAlign: 'left',
  },
  errorText: {
    color: '#d32f2f',
    fontWeight: 'bold',
  },
  noDataText: {
    color: '#666',
    fontStyle: 'italic',
  },
});

export default SQLResultChart; 