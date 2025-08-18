exports.validate = async function(data) {
  const { change_order, items } = data;
  
  const warnings = [];
  
  for (const item of items) {
    const currentRevision = item.revisionValue;
    const proposedRevision = item.proposedRevision;
    
    if (!currentRevision || !proposedRevision) {
      continue;
    }
    
    const currentNum = parseInt(currentRevision, 10);
    const proposedNum = parseInt(proposedRevision, 10);
    
    if (isNaN(currentNum) || isNaN(proposedNum)) {
      console.log(`Skipping non-numeric revision comparison for ${item.name}: ${currentRevision} -> ${proposedRevision}`);
      continue;
    }
    
    const expectedNext = currentNum + 1;
    
    if (proposedNum > expectedNext) {
      const skippedCount = proposedNum - expectedNext;
      warnings.push({
        item: item.name,
        eid: item.eid,
        current: currentRevision,
        proposed: proposedRevision,
        expected: expectedNext.toString(),
        skipped: skippedCount
      });
      
      console.warn(`Revision sequence jump detected for "${item.name}" (${item.eid}): ${currentRevision} → ${proposedRevision} (skips ${skippedCount} revision${skippedCount > 1 ? 's' : ''})`);
    }
  }
  
  if (warnings.length > 0) {
    const itemList = warnings.map(w => 
      `• ${w.item} (${w.eid}): Rev ${w.current} → ${w.proposed} (expected ${w.expected}, skips ${w.skipped})`
    ).join('\n');
    
    return {
      valid: false,
      message: `${warnings.length} item${warnings.length > 1 ? 's' : ''} attempting to skip revision numbers:\n${itemList}`
    };
  }
  
  console.info(`All ${items.length} items follow sequential revision numbering`);
  
  return {
    valid: true,
    message: 'All revisions follow sequential numbering'
  };
}