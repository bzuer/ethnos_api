#!/bin/bash

set -e

echo "🔍 DATABASE USAGE ANALYSIS"
echo "=========================="
echo

# Database connection
DB_USER="api_dev"
DB_PASS="ap1p@ss"
DB_NAME="data_db"

# Get all views
echo "📊 VIEWS ANALYSIS"
echo "=================="

views=($(mariadb -u $DB_USER -p$DB_PASS -D $DB_NAME -e "SHOW TABLES;" | grep '^v_'))

for view in "${views[@]}"; do
    echo -n "View: $view - "
    
    # Check if view is used in service files
    if grep -r "$view" src/services/ --include="*.js" > /dev/null 2>&1; then
        echo "✅ USED"
    else
        echo "❌ UNUSED"
    fi
done

echo
echo "🔍 FULLTEXT INDEX ANALYSIS"
echo "=========================="

# Check FULLTEXT indexes
ft_indexes=($(mariadb -u $DB_USER -p$DB_PASS -D $DB_NAME -e "
SELECT CONCAT(TABLE_NAME, '.', INDEX_NAME) 
FROM information_schema.STATISTICS 
WHERE TABLE_SCHEMA = 'data_db' 
  AND INDEX_TYPE = 'FULLTEXT'
  AND INDEX_NAME != 'PRIMARY'
GROUP BY TABLE_NAME, INDEX_NAME;
" | tail -n +2))

for index in "${ft_indexes[@]}"; do
    table=$(echo $index | cut -d'.' -f1)
    index_name=$(echo $index | cut -d'.' -f2)
    echo -n "FULLTEXT Index: $index - "
    
    # Check for MATCH() usage in service files
    if grep -r "MATCH\|$index_name" src/services/ --include="*.js" > /dev/null 2>&1; then
        echo "✅ USED"
    else
        echo "❌ UNUSED"
    fi
done

echo
echo "🔍 REGULAR INDEX ANALYSIS"
echo "========================"

# Check most important table indexes
important_tables=("works" "persons" "organizations" "venues" "publications" "authorships")

for table in "${important_tables[@]}"; do
    echo "Table: $table"
    echo "============"
    
    indexes=($(mariadb -u $DB_USER -p$DB_PASS -D $DB_NAME -e "
    SELECT INDEX_NAME 
    FROM information_schema.STATISTICS 
    WHERE TABLE_SCHEMA = 'data_db' 
      AND TABLE_NAME = '$table'
      AND INDEX_NAME != 'PRIMARY'
      AND INDEX_TYPE != 'FULLTEXT'
    GROUP BY INDEX_NAME;
    " | tail -n +2))
    
    for index in "${indexes[@]}"; do
        echo -n "  Index: $index - "
        
        # Get columns in this index
        columns=$(mariadb -u $DB_USER -p$DB_PASS -D $DB_NAME -e "
        SELECT GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX)
        FROM information_schema.STATISTICS 
        WHERE TABLE_SCHEMA = 'data_db' 
          AND TABLE_NAME = '$table'
          AND INDEX_NAME = '$index'
        GROUP BY INDEX_NAME;
        " | tail -n +2)
        
        # Check if columns are used in WHERE, JOIN, ORDER BY clauses
        used=false
        IFS=',' read -ra COLS <<< "$columns"
        for col in "${COLS[@]}"; do
            if grep -r "WHERE.*$col\|JOIN.*$col\|ORDER BY.*$col\|GROUP BY.*$col" src/services/ --include="*.js" > /dev/null 2>&1; then
                used=true
                break
            fi
        done
        
        if $used; then
            echo "✅ USED (columns: $columns)"
        else
            echo "❌ POTENTIALLY UNUSED (columns: $columns)"
        fi
    done
    echo
done

echo "📝 RECOMMENDATIONS"
echo "=================="
echo "1. Remove unused views to reduce maintenance overhead"
echo "2. Drop unused indexes to improve INSERT/UPDATE performance"
echo "3. Keep indexes that support WHERE, JOIN, ORDER BY operations"
echo "4. Monitor query performance after changes"