// Bulletin Announcement Feature
// Simple, standalone implementation

(function() {
  'use strict';
  
  console.log('[Bulletin] Script loaded - VERSION 2.0 WITH EXPAND BUTTON');
  
  // Set global flag
  window.bulletinScriptLoaded = true;
  
  // Function to get active bulletins from API
  function getActiveBulletin() {
    if (typeof frappe === 'undefined' || !frappe.call) {
      console.log('[Bulletin] Frappe not ready, retrying...');
      setTimeout(getActiveBulletin, 500);
      return;
    }
    
    frappe.call({
      method: "frappe_hfhg.frappe_hfhg.doctype.bulletin.bulletin.get_active_bulletin",
      callback: function(r) {
        console.log('[Bulletin] API Response:', r);
        if (r && r.message) {
          // Handle both array and single object responses (backward compatibility)
          let bulletins = [];
          if (Array.isArray(r.message)) {
            bulletins = r.message;
          } else if (r.message.message) {
            // Single bulletin object (old format)
            bulletins = [r.message];
          }
          
          if (bulletins.length > 0) {
            console.log('[Bulletin] Found', bulletins.length, 'active bulletin(s)');
            showBulletins(bulletins);
          } else {
            console.log('[Bulletin] No active bulletins found');
            // Remove existing bulletin if no active ones
            const existing = document.getElementById('custom-bulletin-announcement');
            if (existing) {
              existing.remove();
            }
          }
        } else {
          console.log('[Bulletin] No message in response');
          // Remove existing bulletin if no active ones
          const existing = document.getElementById('custom-bulletin-announcement');
          if (existing) {
            existing.remove();
          }
        }
      },
      error: function(err) {
        console.error('[Bulletin] API Error:', err);
        // Remove existing bulletin on error
        const existing = document.getElementById('custom-bulletin-announcement');
        if (existing) {
          existing.remove();
        }
      }
    });
  }
  
  // Function to extract plain text from HTML while preserving line breaks
  function extractText(html) {
    if (!html) return '';
    
    // If it's already plain text (no HTML tags), return as-is
    if (!/<[^>]+>/.test(html)) {
      return html;
    }
    
    // Replace common HTML line break elements with newlines BEFORE parsing
    // This preserves the line breaks in the text content
    let processedHtml = html
      .replace(/<br\s*\/?>/gi, '\n')           // <br> and <br/> -> newline
      .replace(/<\/p>/gi, '\n')                 // </p> -> newline
      .replace(/<\/div>/gi, '\n')              // </div> -> newline
      .replace(/<li[^>]*>/gi, '\n• ')          // <li> -> newline + bullet
      .replace(/<\/li>/gi, '')                 // Remove </li>
      .replace(/<p[^>]*>/gi, '')               // Remove opening <p>
      .replace(/<div[^>]*>/gi, '');            // Remove opening <div>
    
    // Now parse the HTML to extract text (which will include our newlines)
    const div = document.createElement('div');
    div.innerHTML = processedHtml;
    
    // Get text content which now includes newlines
    let text = div.textContent || div.innerText || '';
    
    // Clean up: normalize multiple consecutive newlines (more than 2) to double newline
    text = text.replace(/\n{3,}/g, '\n\n');
    
    // Remove leading/trailing whitespace but preserve internal newlines
    text = text.replace(/^[\s\n]+|[\s\n]+$/g, '');
    
    return text;
  }
  
  // Function to check if we're on home page
  function isHomePage() {
    try {
      if (typeof frappe === 'undefined' || !frappe.get_route) {
        console.log('[Bulletin] Frappe or get_route not available');
        return false;
      }
      
      const route = frappe.get_route();
      const pathname = window.location.pathname;
      
      console.log('[Bulletin] Route:', route, 'Pathname:', pathname);
      
      if (!route || !Array.isArray(route)) {
        console.log('[Bulletin] Invalid route format');
        return false;
      }
      
      // Home page detection:
      // 1. Pathname is exactly '/app/home' or '/app' or '/app/' -> IS home
      // 2. Route is empty array [] -> IS home
      // 3. Route is ['Workspaces', 'HOME'] -> IS home (this is the home workspace)
      // 4. Route has only one element that's 'home' or starts with 'home-' -> IS home
      // 5. Pathname has only one part after /app/ and it's 'home' -> IS home
      
      // First, check pathname - most reliable indicator
      if (pathname === '/app' || pathname === '/app/' || pathname === '/app/home') {
        console.log('[Bulletin] Pathname is /app or /app/home, IS home');
        return true;
      }
      
      // Check if route is ['Workspaces', 'HOME'] - this is the home workspace
      if (route.length === 2 && 
          route[0] === 'Workspaces' && 
          route[1].toUpperCase() === 'HOME') {
        console.log('[Bulletin] Route is [Workspaces, HOME], IS home');
        return true;
      }
      
      // Check if route is empty
      if (route.length === 0) {
        console.log('[Bulletin] Empty route, IS home');
        return true;
      }
      
      // Check if route has single element that's 'home'
      if (route.length === 1) {
        const firstPart = route[0];
        const isHome = firstPart === '' || 
                      firstPart === 'home' || 
                      firstPart.toLowerCase() === 'home' ||
                      firstPart.startsWith('home-');
        console.log('[Bulletin] Single route part:', firstPart, 'Is home:', isHome);
        return isHome;
      }
      
      // Check pathname parts - if only one part and it's 'home', it's home
      const pathParts = pathname.split('/').filter(p => p && p !== 'app');
      if (pathParts.length === 1 && pathParts[0].toLowerCase() === 'home') {
        console.log('[Bulletin] Pathname has single "home" part, IS home');
        return true;
      }
      
      // If route has multiple parts and pathname has multiple parts, it's NOT home
      // Examples: /app/surgery/view/list -> NOT home
      //          /app/lead/view/list -> NOT home
      console.log('[Bulletin] Route has multiple parts and not home workspace, NOT home:', route);
      return false;
      
    } catch(e) {
      console.error('[Bulletin] Error checking route:', e);
      return false;
    }
  }
  
  // Function to show multiple bulletins in navbar
  function showBulletins(bulletins) {
    // Show bulletins on ALL pages (removed home page restriction)
    console.log('[Bulletin] showBulletins called - showing', bulletins.length, 'bulletin(s) on current page');
    
    // Remove existing bulletin
    const existing = document.getElementById('custom-bulletin-announcement');
    if (existing) {
      existing.remove();
    }
    
    // Extract texts from HTML for all bulletins
    const bulletinTexts = [];
    bulletins.forEach(function(bulletinItem) {
      const text = extractText(bulletinItem.message);
      if (text && text.trim()) {
        // Trim only leading/trailing whitespace, preserve internal newlines
        const trimmedText = text.replace(/^\s+|\s+$/g, '');
        if (trimmedText) {
          bulletinTexts.push(trimmedText);
        }
      }
    });
    
    if (bulletinTexts.length === 0) {
      console.log('[Bulletin] No valid text to display');
      return;
    }
    
    // Combine all bulletins into a single message with bullet points
    const combinedText = bulletinTexts.map(function(text, index) {
      return '• ' + text;
    }).join('\n');
    
    // Use the combined text for display
    const displayText = combinedText;
    
    // Create bulletin container - LIGHT BLUE STYLING - ALIGNED WITH SEARCH BAR
    const bulletin = document.createElement('div');
    bulletin.id = 'custom-bulletin-announcement';
    // Match search bar height (28px) and alignment
    bulletin.style.cssText = 'display:flex;align-items:center;background:linear-gradient(135deg, #f5f9fc 0%, #e8f4f8 100%);border:1px solid #b3d9f2;border-radius:6px;padding:0 12px;margin-right:12px;font-size:13px;color:#6b8ba3;box-shadow:0 1px 4px rgba(179,217,242,0.2), 0 1px 2px rgba(0,0,0,0.05);z-index:9999;flex-shrink:0;transition:all 0.3s ease;position:relative;max-width:400px;font-weight:500;height:28px;line-height:28px;';
    
    // Create icon span - SMALLER TO MATCH HEIGHT
    const iconSpan = document.createElement('span');
    iconSpan.style.cssText = 'margin-right:8px;font-size:14px;flex-shrink:0;display:flex;align-items:center;height:100%;';
    iconSpan.textContent = '📢';
    
    // Create message container
    const messageContainer = document.createElement('div');
    messageContainer.style.cssText = 'flex:1;display:flex;align-items:center;min-width:0;';
    
    // Create message span - always start collapsed
    const messageSpan = document.createElement('span');
    messageSpan.style.cssText = 'overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:250px;display:inline-block;vertical-align:middle;line-height:1.4;';
    // Show first bulletin text in collapsed view
    const firstBulletinText = bulletinTexts[0];
    messageSpan.textContent = firstBulletinText;
    messageSpan.title = displayText; // Show all bulletins on hover
    
    // Create expand/collapse button - LIGHT BLUE THEME - MATCHES HEIGHT
    const expandButton = document.createElement('button');
    expandButton.type = 'button';
    expandButton.style.cssText = 'margin-left:8px !important;background:linear-gradient(135deg, #9ec5e0 0%, #8bb8d4 100%) !important;border:none !important;border-radius:4px !important;padding:0 10px !important;font-size:11px !important;color:#fff !important;cursor:pointer !important;flex-shrink:0 !important;font-weight:600 !important;white-space:nowrap !important;display:inline-flex !important;align-items:center !important;justify-content:center !important;visibility:visible !important;opacity:1 !important;box-shadow:0 1px 3px rgba(158,197,224,0.3) !important;transition:all 0.2s ease !important;height:22px !important;line-height:22px !important;';
    expandButton.textContent = 'Expand';
    expandButton.title = 'Click to expand message';
    expandButton.id = 'bulletin-expand-button';
    
    // Add hover effect - PALE BLUE THEME
    expandButton.onmouseover = function() {
      this.style.background = 'linear-gradient(135deg, #8bb8d4 0%, #7aa8c8 100%) !important';
      this.style.transform = 'translateY(-1px)';
      this.style.boxShadow = '0 2px 6px rgba(158,197,224,0.4) !important';
    };
    expandButton.onmouseout = function() {
      this.style.background = 'linear-gradient(135deg, #9ec5e0 0%, #8bb8d4 100%) !important';
      this.style.transform = 'translateY(0)';
      this.style.boxShadow = '0 1px 3px rgba(158,197,224,0.3) !important';
    };
    
    console.log('[Bulletin] ===== EXPAND BUTTON CREATED =====');
    console.log('[Bulletin] Expand button created:', expandButton);
    console.log('[Bulletin] Button text:', expandButton.textContent);
    console.log('[Bulletin] Button style:', expandButton.style.cssText);
    
    // Store expanded state and click handler reference
    let isExpanded = false;
    let clickOutsideHandler = null;
    
    // Function to remove click-outside listener
    function removeClickOutsideListener() {
      if (clickOutsideHandler) {
        document.removeEventListener('click', clickOutsideHandler, true);
        clickOutsideHandler = null;
        console.log('[Bulletin] Click-outside listener removed');
      }
    }
    
    // Function to collapse the bulletin (without toggling)
    function collapseBulletin() {
      if (!isExpanded) {
        return; // Already collapsed
      }
      
      isExpanded = false;
      console.log('[Bulletin] Collapsing bulletin...');
      
      // Update button text and title
      expandButton.textContent = 'Expand';
      expandButton.title = 'Click to expand message';
      
      // Remove click-outside listener when collapsing
      removeClickOutsideListener();
      
      // Hide popover - hide it completely
      const popover = document.getElementById('bulletin-popover');
      if (popover) {
        popover.style.display = 'none';
        popover.style.visibility = 'hidden';
        popover.style.opacity = '0';
      }
      
      // Reset styles to collapsed state
      messageSpan.style.cssText = 'overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:250px;display:inline-block;vertical-align:middle;line-height:1.4;';
      bulletin.style.height = '28px';
      bulletin.style.padding = '0 12px';
      bulletin.style.maxWidth = '400px';
      bulletin.style.flexWrap = 'nowrap';
      bulletin.style.alignItems = 'center';
      
      messageContainer.style.flexDirection = 'row';
      messageContainer.style.alignItems = 'center';
      messageContainer.style.width = 'auto';
      
      expandButton.style.marginLeft = '8px';
      expandButton.style.height = '22px';
      expandButton.style.padding = '0 10px';
      
      console.log('[Bulletin] ✓ Collapsed');
    }
    
    // Click handler to expand/collapse
    function toggleExpand(e) {
      if (e) {
        e.stopPropagation();
        e.preventDefault();
      }
      
      console.log('[Bulletin] Toggle expand clicked, current state:', isExpanded, 'Bulletins count:', bulletinTexts.length);
      
      // Toggle the state
      isExpanded = !isExpanded;
      
      if (isExpanded) {
        // Expand - show full text in a popover below the navbar
        expandButton.textContent = 'Collapse';
        expandButton.title = 'Click to collapse message';
        
        // Create a popover element that appears below the bulletin
        let popover = document.getElementById('bulletin-popover');
        if (!popover) {
          popover = document.createElement('div');
          popover.id = 'bulletin-popover';
          popover.style.cssText = 'position:absolute;top:100%;left:0;margin-top:8px;background:linear-gradient(135deg, #f5f9fc 0%, #e8f4f8 100%);border:1px solid #b3d9f2;border-radius:8px;padding:16px 20px;box-shadow:0 4px 12px rgba(179,217,242,0.25), 0 2px 6px rgba(0,0,0,0.1);z-index:10000;min-width:400px;max-width:600px;color:#6b8ba3;font-size:14px;line-height:1.6;word-wrap:break-word;white-space:pre-line;display:block;visibility:visible;opacity:1;';
          // Display all bulletins with bullet points
          popover.textContent = displayText;
          bulletin.style.position = 'relative';
          bulletin.appendChild(popover);
          
          // Prevent clicks inside popover from closing it
          popover.addEventListener('click', function(e) {
            e.stopPropagation();
          });
        } else {
          // Re-add to DOM if it was removed
          if (!popover.parentElement) {
            bulletin.appendChild(popover);
          }
          popover.style.display = 'block';
          popover.style.visibility = 'visible';
          popover.style.opacity = '1';
        }
        
        // Keep bulletin collapsed but show popover
        messageSpan.style.cssText = 'overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:250px;display:inline-block;vertical-align:middle;line-height:1.4;';
        bulletin.style.height = '28px';
        bulletin.style.padding = '0 12px';
        bulletin.style.maxWidth = '400px';
        bulletin.style.flexWrap = 'nowrap';
        bulletin.style.alignItems = 'center';
        
        messageContainer.style.flexDirection = 'row';
        messageContainer.style.alignItems = 'center';
        messageContainer.style.width = 'auto';
        
        expandButton.style.marginLeft = '8px';
        expandButton.style.height = '22px';
        expandButton.style.padding = '0 10px';
        
        // Remove any existing click-outside listener first
        removeClickOutsideListener();
        
        // Add click-outside listener to collapse when clicking outside
        // Use a longer delay to ensure popover is fully rendered
        setTimeout(function() {
          clickOutsideHandler = function(e) {
            const bulletinEl = document.getElementById('custom-bulletin-announcement');
            const popoverEl = document.getElementById('bulletin-popover');
            
            // Check if elements exist and popover is visible
            if (!bulletinEl || !popoverEl) {
              return;
            }
            
            // Check visibility using multiple methods
            const popoverVisible = popoverEl.offsetParent !== null && 
                                   popoverEl.style.display !== 'none' &&
                                   window.getComputedStyle(popoverEl).display !== 'none';
            
            if (!popoverVisible) {
              return;
            }
            
            // Check if click is outside both bulletin and popover
            const clickedInsideBulletin = bulletinEl.contains(e.target);
            const clickedInsidePopover = popoverEl.contains(e.target);
            
            if (!clickedInsideBulletin && !clickedInsidePopover) {
              console.log('[Bulletin] Click outside detected, collapsing...');
              // Collapse the bulletin directly (don't toggle)
              collapseBulletin();
            }
          };
          
          // Add listener after a delay to avoid immediate collapse
          // Use capture phase to catch events earlier
          setTimeout(function() {
            document.addEventListener('click', clickOutsideHandler, true);
            console.log('[Bulletin] Click-outside listener attached');
          }, 200);
        }, 200);
        
        console.log('[Bulletin] ✓ Expanded - Popover shown');
      } else {
        // Collapse using the dedicated function
        console.log('[Bulletin] Collapsing from toggle...');
        collapseBulletin();
      }
    }
    
    // Make button clickable - use direct event handler
    expandButton.onclick = function(e) {
      e.stopPropagation();
      e.preventDefault();
      console.log('[Bulletin] Expand button clicked');
      toggleExpand(e);
      return false;
    };
    
    // Append elements - VERIFY EACH STEP
    console.log('[Bulletin] Appending messageSpan to messageContainer');
    messageContainer.appendChild(messageSpan);
    
    console.log('[Bulletin] Appending expandButton to messageContainer');
    messageContainer.appendChild(expandButton);
    console.log('[Bulletin] expandButton parent after append:', expandButton.parentElement);
    console.log('[Bulletin] messageContainer children:', messageContainer.children.length, Array.from(messageContainer.children).map(c => c.tagName + (c.id ? '#' + c.id : '')));
    
    console.log('[Bulletin] Appending iconSpan to bulletin');
    bulletin.appendChild(iconSpan);
    
    console.log('[Bulletin] Appending messageContainer to bulletin');
    bulletin.appendChild(messageContainer);
    console.log('[Bulletin] bulletin children:', bulletin.children.length);
    
    // Verify button is in DOM - IMMEDIATE CHECK
    const btnCheck = document.getElementById('bulletin-expand-button');
    if (btnCheck) {
      console.log('[Bulletin] ✓✓✓ Expand button FOUND in DOM immediately!');
      console.log('[Bulletin] Button parent:', btnCheck.parentElement);
      console.log('[Bulletin] Button visible:', btnCheck.offsetWidth > 0 && btnCheck.offsetHeight > 0);
      console.log('[Bulletin] Button computed display:', window.getComputedStyle(btnCheck).display);
    } else {
      console.error('[Bulletin] ✗✗✗ Expand button NOT in DOM after append!');
      console.error('[Bulletin] messageContainer.innerHTML:', messageContainer.innerHTML.substring(0, 200));
    }
    
    // Also check after a delay
    setTimeout(function() {
      const btn = document.getElementById('bulletin-expand-button');
      if (btn) {
        const style = window.getComputedStyle(btn);
        console.log('[Bulletin] ✓ Expand button verified in DOM');
        console.log('[Bulletin] Display:', style.display, 'Visibility:', style.visibility, 'Opacity:', style.opacity);
        console.log('[Bulletin] Size:', btn.offsetWidth + 'x' + btn.offsetHeight);
        console.log('[Bulletin] Position:', btn.getBoundingClientRect());
      } else {
        console.error('[Bulletin] ✗ Expand button still NOT found after delay!');
      }
    }, 500);
    
    console.log('[Bulletin] Bulletin created with visible Expand button (' + bulletinTexts.length + ' bulletin(s))');
    
    // Find insertion point - try multiple locations
    // Ensure containers allow overflow so expanded content stays visible
    const formInline = document.querySelector('.navbar .form-inline');
    const searchBar = document.querySelector('.navbar .search-bar');
    const navbarCollapse = document.querySelector('.navbar .navbar-collapse');
    
    if (formInline && searchBar) {
      formInline.insertBefore(bulletin, searchBar);
      // Ensure parent containers allow overflow
      if (formInline.parentElement) {
        formInline.parentElement.style.overflow = 'visible';
        formInline.parentElement.style.position = 'relative';
      }
      formInline.style.overflow = 'visible';
      console.log('[Bulletin] Inserted before search bar');
    } else if (formInline) {
      formInline.insertBefore(bulletin, formInline.firstChild);
      if (formInline.parentElement) {
        formInline.parentElement.style.overflow = 'visible';
        formInline.parentElement.style.position = 'relative';
      }
      formInline.style.overflow = 'visible';
      console.log('[Bulletin] Inserted at start of form-inline');
    } else if (navbarCollapse) {
      navbarCollapse.insertBefore(bulletin, navbarCollapse.firstChild);
      if (navbarCollapse.parentElement) {
        navbarCollapse.parentElement.style.overflow = 'visible';
        navbarCollapse.parentElement.style.position = 'relative';
      }
      navbarCollapse.style.overflow = 'visible';
      console.log('[Bulletin] Inserted at start of navbar-collapse');
    } else {
      const navbar = document.querySelector('.navbar');
      if (navbar) {
        const container = navbar.querySelector('.container') || navbar;
        container.insertBefore(bulletin, container.firstChild);
        container.style.overflow = 'visible';
        container.style.position = 'relative';
        console.log('[Bulletin] Inserted in navbar container');
      }
    }
    
    // Ensure navbar itself allows overflow
    const navbar = document.querySelector('.navbar');
    if (navbar) {
      navbar.style.overflow = 'visible';
      navbar.style.position = 'relative';
    }
  }
  
  // Initialize when page is ready
  function init() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function() {
        setTimeout(getActiveBulletin, 1000);
      });
    } else {
      setTimeout(getActiveBulletin, 1000);
    }
    
    // Reload on route changes (to show on all pages)
    if (typeof frappe !== 'undefined' && frappe.router) {
      frappe.router.on('change', function() {
        console.log('[Bulletin] Route changed, reloading bulletin');
        setTimeout(getActiveBulletin, 500);
      });
    } else {
      // Fallback: check route periodically if router not available
      setTimeout(function checkRoute() {
        if (typeof frappe !== 'undefined' && frappe.get_route) {
          getActiveBulletin();
        }
        setTimeout(checkRoute, 2000);
      }, 2000);
    }
  }
  
  // Start initialization
  init();
  
  // Expose test function
  window.testBulletin = function() {
    getActiveBulletin();
  };
  
  console.log('[Bulletin] Initialization complete');
})();

